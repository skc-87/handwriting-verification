const express = require("express");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const router = express.Router();


  // ---------------------------
  // EXISTING ROUTE: Fetch Files
  // ---------------------------
  router.post("/fetch-file-path", async (req, res) => {
    console.log("------ [FETCH FILE PATH API HIT] ------");

    const { student_id, fileCategory } = req.body;
    const authToken = req.headers.authorization?.split(" ")[1];

    if (!authToken || !student_id || !fileCategory) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ message: "Missing required fields" });
    }

    console.log("Arguments to Python script:", student_id, fileCategory, authToken);
    const pythonScript = path.join(__dirname, "../../model/fetch_file.py");
    console.log("📄 Running Python script at:", pythonScript);

    execFile("python", [pythonScript, student_id, fileCategory, authToken], (error, stdout, stderr) => {
      console.log("✅ STDOUT:", stdout);
      console.log("⚠️ STDERR:", stderr);

      if (error) {
        console.error("❌ Python ExecFile Error:", error);
        return res.status(500).json({ message: "Python script error", error: stderr || error.message });
      }

      try {
        const result = JSON.parse(stdout);
        console.log("✅ Parsed Result:", result);

        if (result.status === "success") {
          res.json({ message: "Files fetched!", files: result.files });
        } else {
          res.status(400).json({ message: result.message });
        }
      } catch (err) {
        console.error("❌ JSON Parse Error:", err.message);
        res.status(500).json({ message: "Failed to parse Python response", error: err.message });
      }
    });
  });



  // ---------------------------
  // NEW ROUTE: Compare Files
  // ---------------------------
  console.log("🛠 Compare API is active");
  router.get("/compare-handwriting/:studentId", async (req, res) => {
    console.log("------ [COMPARE HANDWRITING API HIT] ------");

    const studentId = req.params.studentId;
    const authToken = req.headers.authorization?.split(" ")[1];

    if (!authToken || !studentId) {
      console.log("❌ Missing student ID or token");
      return res.status(400).json({ message: "Missing required fields" });
    }

    const fetchScript = path.join(__dirname, "../../model/fetch_file.py");
    const compareScript = path.join(__dirname, "../../model/compare_handwriting.py");

    // Step 1: Fetch the files
    console.log(`[🔧 Fetch] Running fetch_file.py for studentId=${studentId}`);
    execFile("python", [fetchScript, studentId, "all", authToken], (err, stdout, stderr) => {
      if (err) {
        console.error("❌ Error in fetch_file.py:", stderr || err.message);
        return res.status(500).json({ message: "Error fetching files" });
      }

      console.log("[✅ Fetch] Raw Output:", stdout);  
      let fetchResult;
    try {
      fetchResult = JSON.parse(stdout);
    } catch (parseErr) {
      console.error("❌ Failed to parse fetch_file.py response:", parseErr);
      return res.status(500).json({ message: "Fetch script JSON parse error" });
    }

    if (fetchResult.status !== "success") {
      console.warn("⚠️ Fetch failed:", fetchResult.message);
      return res.status(400).json({ message: fetchResult.message });
    }


    console.log("[✅ Fetch] Files fetched successfully, proceeding to comparison...");

      // Step 2: Compare handwriting
      execFile("python", [compareScript, "--student_id", studentId], (err2, stdout2, stderr2) => {
        if (err2) {
          console.error("❌ Error in compare_handwriting.py:", stderr2 || err2.message);
          return res.status(500).json({ message: "Error comparing handwriting" });
        }

        console.log("[✅ Compare] Raw Output:", stdout2);

        try {
          const result = JSON.parse(stdout2);
          console.log("[✅ Compare] Parsed result:", result);
          res.json(result);
        } catch (errParse) {
          console.error("❌ JSON parse error in comparison:", errParse.message);
          res.status(500).json({ message: "Failed to parse compare output", error: errParse.message });
        }
      });
    });
  });

  // ---------------------------
// NEW ROUTE: Register Student with Face
// ---------------------------
router.post("/register-face", async (req, res) => {
  console.log("------ [FACE REGISTRATION API HIT] ------");
  
  // Destructure with default values to prevent undefined errors
  const { student_id = '', name = '', image = '' } = req.body;
  const authToken = req.headers.authorization?.split(" ")[1] || '';

  // Enhanced validation with specific error messages
  const missingFields = [];
  if (!authToken) missingFields.push('authorization');
  if (!student_id) missingFields.push('student_id');
  if (!name) missingFields.push('name');
  if (!image) missingFields.push('image');

  if (missingFields.length > 0) {
      return res.status(400).json({ 
          success: false,
          message: "Missing required fields",
          missing_fields: missingFields,
          required_fields: ["authorization", "student_id", "name", "image"]
      });
  }

  // More comprehensive image format validation
  const validImageRegex = /^data:image\/(jpeg|jpg|png);base64,/;
  if (!validImageRegex.test(image)) {
      return res.status(400).json({
          success: false,
          message: "Invalid image format. Only JPEG/JPG/PNG base64 supported",
          supported_formats: ["image/jpeg", "image/jpg", "image/png"]
      });
  }

  // Create temp directory if it doesn't exist
  const tempDir = path.join(__dirname, "../../backend/temp");
  if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempImagePath = path.join(tempDir, `${student_id}_${Date.now()}.${image.split(';')[0].split('/')[1]}`);
  
  try {
      // Validate Python script existence
      const pythonScript = path.join(__dirname, "../../model_for_face/face_recognition_system.py");
      if (!fs.existsSync(pythonScript)) {
          throw new Error("Face recognition system not found at: " + pythonScript);
      }

      // Save image with proper buffer handling
      const base64Data = image.replace(validImageRegex, "");
      await fs.promises.writeFile(tempImagePath, base64Data, 'base64');

      // Validate the image was written successfully
      const stats = await fs.promises.stat(tempImagePath);
      if (stats.size === 0) {
          throw new Error("Failed to save image file");
      }

      // Construct arguments with validation
      const args = [
          "register",
          student_id.trim(),
          name.trim(),
          tempImagePath,
          authToken  // Must be last argument (sys.argv[-1] in Python)
      ];

      // Log sanitized command (without auth token)
      console.log(`🔍 Executing: python ${pythonScript} register ${student_id} [name] [image_path] [token_redacted]`);

      // Execute with timeout and better resource cleanup
      const result = await new Promise((resolve, reject) => {
          const child = execFile("python", [pythonScript, ...args], { timeout: 30000 }, (error, stdout, stderr) => {
              // Cleanup temp file regardless of success/failure
              fs.unlink(tempImagePath, (err) => {
                  if (err) console.error("Temp file cleanup error:", err.message);
              });

              if (error) {
                  console.error(`🐍 Python Error (${error.code}): ${stderr || error.message}`);
                  const errorMsg = error.code === 'ETIMEDOUT' 
                      ? "Face recognition process timed out"
                      : `Face registration failed: ${stderr || error.message}`;
                  reject(new Error(errorMsg));
              } else {
                  try {
                      const output = stdout.trim();
                      if (!output) {
                          throw new Error("Empty response from Python script");
                      }
                      resolve(JSON.parse(output));
                  } catch (e) {
                      console.error("Failed to parse Python output:", stdout);
                      reject(new Error("Invalid JSON response from Python script"));
                  }
              }
          });

          // Handle process exit
          child.on('exit', (code) => {
              if (code !== 0) {
                  console.error(`Python process exited with code ${code}`);
              }
          });
      });

      // Validate Python script response structure
      if (typeof result.success !== 'boolean') {
          throw new Error("Invalid response format from face recognition system");
      }

      res.status(result.success ? 200 : 400).json({
          success: result.success,
          message: result.message || (result.success ? "Face registered successfully" : "Face registration failed"),
          data: result.data || null
      });

  } catch (error) {
      console.error("🚨 System Error:", error.message);
      res.status(500).json({
          success: false,
          message: error.message,
          error_type: error.constructor.name,
          system_error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
});
// ---------------------------
// Optimized Attendance Route
// ---------------------------
router.post("/take-attendance", async (req, res) => {
  console.log("------ [FACE ATTENDANCE API HIT] ------");
  
  // Destructure with default values
  const { subject = '', image = '' } = req.body;
  const authToken = req.headers.authorization?.split(" ")[1] || '';

  // Detailed validation
  const missingFields = [];
  if (!authToken) missingFields.push('authorization');
  if (!subject) missingFields.push('subject');
  if (!image) missingFields.push('image');

  if (missingFields.length > 0) {
      return res.status(400).json({
          success: false,
          message: "Missing required fields",
          missing_fields: missingFields,
          required_fields: ["authorization", "subject", "image"]
      });
  }

  // Enhanced image validation
  const validImageRegex = /^data:image\/(jpeg|jpg|png);base64,/;
  if (!validImageRegex.test(image)) {
      return res.status(400).json({
          success: false,
          message: "Invalid image format. Only JPEG/JPG/PNG base64 supported",
          supported_formats: ["image/jpeg", "image/jpg", "image/png"]
      });
  }

  // Ensure temp directory exists
  const tempDir = path.join(__dirname, "../../backend/temp");
  if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
  }

  const fileExtension = image.split(';')[0].split('/')[1];
  const tempImagePath = path.join(tempDir, `attendance_${Date.now()}.${fileExtension}`);

  try {
      // Verify Python script with absolute path
      const pythonScript = path.join(__dirname, "../../model_for_face/face_recognition_system.py");
      if (!fs.existsSync(pythonScript)) {
          throw new Error(`Attendance system not found at: ${pythonScript}`);
      }

      // Save image with validation
      const base64Data = image.replace(validImageRegex, "");
      await fs.promises.writeFile(tempImagePath, base64Data, 'base64');
      
      // Verify image was saved
      const stats = await fs.promises.stat(tempImagePath);
      if (stats.size === 0) {
          throw new Error("Failed to save attendance image");
      }

      // Construct arguments with input sanitization
      const args = [
          "attendance",
          subject.trim(),
          tempImagePath,
          authToken  // Maintain as last argument
      ];

      // Secure logging (redacts auth token)
      console.log(`🔍 Executing: python ${pythonScript} attendance ${subject} [image_path] [token_redacted]`);

      const result = await new Promise((resolve, reject) => {
          const child = execFile(
              "python", 
              [pythonScript, ...args], 
              { timeout: 30000 }, // 30-second timeout
              (error, stdout, stderr) => {
                  // Cleanup temp file in all cases
                  fs.unlink(tempImagePath, (err) => {
                      if (err) console.error("Failed to cleanup temp image:", err.message);
                  });

                  if (error) {
                      const errorMsg = error.code === 'ETIMEDOUT' 
                          ? "Attendance process timed out"
                          : `Attendance failed: ${stderr || error.message}`;
                      console.error(`🐍 Python Error (${error.code}): ${errorMsg}`);
                      reject(new Error(errorMsg));
                  } else {
                      try {
                          const output = stdout.trim();
                          if (!output) throw new Error("Empty response from Python script");
                          resolve(JSON.parse(output));
                      } catch (e) {
                          console.error("Failed to parse Python output:", stdout);
                          reject(new Error("Invalid response from attendance system"));
                      }
                  }
              }
          );

          child.on('exit', (code) => {
              if (code !== 0) {
                  console.error(`Python process exited with code ${code}`);
              }
          });
      });

      // Validate and standardize response
      if (typeof result.success !== 'boolean') {
          throw new Error("Invalid response structure from attendance system");
      }

      res.status(result.success ? 200 : 400).json({
          success: result.success,
          message: result.message || (result.success ? "Attendance recorded successfully" : "Failed to record attendance"),
          data: result.data || null,
          recognized: result.recognized || [],
          unrecognized: result.unrecognized || []
      });

  } catch (error) {
      console.error("🚨 Attendance Error:", error.message);
      res.status(500).json({
          success: false,
          message: error.message,
          error_type: error.constructor.name,
          system_error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
});
module.exports = router;

