const express = require("express");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// ---------------------------
// Fetch Files
// ---------------------------
router.post("/fetch-file-path", async (req, res) => {
  console.log("------ [FETCH FILE PATH API HIT] ------");

  const { student_id, fileCategory } = req.body;
  const authToken = req.headers.authorization?.split(" ")[1];

  if (!authToken || !student_id || !fileCategory) {
    console.log("❌ Missing required fields");
    return res.status(400).json({ message: "Missing required fields" });
  }

  console.log(
    "Arguments to Python script:",
    student_id,
    fileCategory,
    authToken
  );
  const pythonScript = path.join(__dirname, "../../model/fetch_file.py");
  console.log("📄 Running Python script at:", pythonScript);

  execFile(
    "python",
    [pythonScript, student_id, fileCategory, authToken],
    (error, stdout, stderr) => {
      console.log("✅ STDOUT:", stdout);
      console.log("⚠️ STDERR:", stderr);

      if (error) {
        console.error("❌ Python ExecFile Error:", error);
        return res
          .status(500)
          .json({
            message: "Python script error",
            error: stderr || error.message,
          });
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
        res
          .status(500)
          .json({
            message: "Failed to parse Python response",
            error: err.message,
          });
      }
    }
  );
});
// ---------------------------
// Compare Files
// ---------------------------
router.get("/compare-handwriting/:studentId", async (req, res) => {
  console.log("------ [COMPARE HANDWRITING API HIT] ------");

  const studentId = req.params.studentId;
  const authToken = req.headers.authorization?.split(" ")[1];

  if (!authToken || !studentId) {
    console.log("❌ Missing student ID or token");
    return res.status(400).json({ message: "Missing required fields" });
  }

  const fetchScript = path.join(__dirname, "../../model/fetch_file.py");
  const compareScript = path.join(
    __dirname,
    "../../model/compare_handwriting.py"
  );

  // Step 1: Fetch the files
  console.log(`[🔧 Fetch] Running fetch_file.py for studentId=${studentId}`);
  execFile(
    "python",
    [fetchScript, studentId, "all", authToken],
    (err, stdout, stderr) => {
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
        return res
          .status(500)
          .json({ message: "Fetch script JSON parse error" });
      }

      if (fetchResult.status !== "success") {
        console.warn("⚠️ Fetch failed:", fetchResult.message);
        return res.status(400).json({ message: fetchResult.message });
      }

      console.log(
        "[✅ Fetch] Files fetched successfully, proceeding to comparison..."
      );

      // Step 2: Compare handwriting
      execFile(
        "python",
        [compareScript, "--student_id", studentId],
        (err2, stdout2, stderr2) => {
          if (err2) {
            console.error(
              "❌ Error in compare_handwriting.py:",
              stderr2 || err2.message
            );
            return res
              .status(500)
              .json({ message: "Error comparing handwriting" });
          }

          console.log("[✅ Compare] Raw Output:", stdout2);

          try {
            const result = JSON.parse(stdout2);
            console.log("[✅ Compare] Parsed result:", result);
            res.json(result);
          } catch (errParse) {
            console.error(
              "❌ JSON parse error in comparison:",
              errParse.message
            );
            res
              .status(500)
              .json({
                message: "Failed to parse compare output",
                error: errParse.message,
              });
          }
        }
      );
    }
  );
});
// ---------------------------
// Register Student with Face
// ---------------------------
router.post("/register-face", async (req, res) => {
  // Destructure with default values to prevent undefined errors
  const { student_id = "", name = "", image = "" } = req.body;
  const authToken = req.headers.authorization?.split(" ")[1] || "";

  // Enhanced validation with specific error messages
  const missingFields = [];
  if (!authToken) missingFields.push("authorization");
  if (!student_id) missingFields.push("student_id");
  if (!name) missingFields.push("name");
  if (!image) missingFields.push("image");

  if (missingFields.length > 0) {
    console.warn(`Registration attempt failed - Missing fields: ${missingFields.join(", ")}`);
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
      missing_fields: missingFields,
      required_fields: ["authorization", "student_id", "name", "image"],
    });
  }

  // More comprehensive image format validation
  const validImageRegex = /^data:image\/(jpeg|jpg|png);base64,/;
  if (!validImageRegex.test(image)) {
    console.warn(`Invalid image format provided for student ${student_id}`);
    return res.status(400).json({
      success: false,
      message: "Invalid image format. Only JPEG/JPG/PNG base64 supported",
      supported_formats: ["image/jpeg", "image/jpg", "image/png"],
    });
  }

  // Create temp directory if it doesn't exist
  const tempDir = path.join(__dirname, "../../backend/temp");
  if (!fs.existsSync(tempDir)) {
    console.log(`Creating temporary directory at ${tempDir}`);
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempImagePath = path.join(
    tempDir,
    `${student_id}_${Date.now()}.${image.split(";")[0].split("/")[1]}`
  );

  try {
    // Validate Python script existence
    const pythonScript = path.join(
      __dirname,
      "../../model_for_face/face_recognition_system.py"
    );
    if (!fs.existsSync(pythonScript)) {
      const errorMsg = "Face recognition system not found";
      console.error(`${errorMsg} at: ${pythonScript}`);
      throw new Error(errorMsg);
    }

    // Save image with proper buffer handling
    const base64Data = image.replace(validImageRegex, "");
    await fs.promises.writeFile(tempImagePath, base64Data, "base64");

    // Validate the image was written successfully
    const stats = await fs.promises.stat(tempImagePath);
    if (stats.size === 0) {
      throw new Error("Failed to save image file - file is empty");
    }

    // Construct arguments with validation
    const args = [
      "register",
      student_id.trim(),
      name.trim(),
      tempImagePath,
      authToken,
    ];

    console.log(`Starting face registration for student ${student_id} (${name})`);

    // Execute with timeout and better resource cleanup
    const result = await new Promise((resolve, reject) => {
      const child = execFile(
        "python",
        [pythonScript, ...args],
        { timeout: 30000 },
        (error, stdout, stderr) => {
          // Cleanup temp file regardless of success/failure
          fs.unlink(tempImagePath, (err) => {
            if (err) console.error(`Failed to cleanup temp file: ${tempImagePath}`, err.message);
          });

          if (error) {
            const errorType = error.code === "ETIMEDOUT" ? "Timeout" : "Processing";
            console.error(`${errorType} error during face registration: ${stderr || error.message}`);
            const errorMsg =
              error.code === "ETIMEDOUT"
                ? "Face recognition process timed out"
                : `Face registration failed: ${stderr || error.message}`;
            reject(new Error(errorMsg));
          } else {
            try {
              const output = stdout.trim();
              if (!output) {
                throw new Error("Received empty response from face recognition system");
              }
              resolve(JSON.parse(output));
            } catch (e) {
              console.error("Failed to understand face recognition response:", stdout);
              reject(new Error("Couldn't interpret the system's response"));
            }
          }
        }
      );

      child.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Face recognition process ended unexpectedly with code ${code}`);
        }
      });
    });

    // Validate Python script response structure
    if (typeof result.success !== "boolean") {
      throw new Error("The system returned an unexpected response format");
    }

    if (result.success) {
      console.log(`Successfully registered face for student ${student_id}`);
    } else {
      console.warn(`Face registration failed for student ${student_id}: ${result.message || "No reason provided"}`);
    }

    res.status(result.success ? 200 : 400).json({
      success: result.success,
      message:
        result.message ||
        (result.success
          ? "Face registered successfully"
          : "Face registration failed"),
      data: result.data || null,
    });
  } catch (error) {
    console.error(`Registration failed for ${student_id}:`, error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      error_type: error.constructor.name,
      system_error:
        process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});
// ---------------------------
// Attendance Route
// ---------------------------
router.post("/take-attendance", async (req, res) => {
  const { subject = "", image = "" } = req.body;
  const authToken = req.headers.authorization?.split(" ")[1] || "";

  // Validate input
  const missingFields = [];
  if (!authToken) missingFields.push("authorization");
  if (!subject) missingFields.push("subject");
  if (!image) missingFields.push("image");

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
      missing_fields: missingFields,
    });
  }

  // Validate image format
  const validImageRegex = /^data:image\/(jpeg|jpg|png);base64,/;
  if (!validImageRegex.test(image)) {
    return res.status(400).json({
      success: false,
      message: "Invalid image format. Only JPEG/JPG/PNG base64 supported",
    });
  }

  // Prepare temporary file
  const tempDir = path.join(__dirname, "../../backend/temp");
  const fileExtension = image.split(";")[0].split("/")[1];
  const tempImagePath = path.join(
    tempDir,
    `attendance_${Date.now()}.${fileExtension}`
  );

  try {
    // Ensure directories exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save image
    const base64Data = image.replace(validImageRegex, "");
    await fs.promises.writeFile(tempImagePath, base64Data, "base64");

    // Verify Python script
    const pythonScript = path.join(
      __dirname,
      "../../model_for_face/face_recognition_system.py"
    );
    if (!fs.existsSync(pythonScript)) {
      throw new Error("Face recognition system not found");
    }

    // Execute Python process
    const result = await new Promise((resolve, reject) => {
      const args = ["attendance", subject.trim(), tempImagePath, authToken];
      const child = execFile(
        "python",
        [pythonScript, ...args],
        { timeout: 45000 },
        (error, stdout, stderr) => {
          // Cleanup temp file
          fs.unlink(tempImagePath, () => null);

          if (error) {
            reject(new Error(
              error.code === "ETIMEDOUT" 
                ? "Attendance process timed out" 
                : "Attendance processing failed"
            ));
          } else {
            try {
              const output = stdout.trim();
              if (!output) throw new Error("Empty response from Python script");
              resolve(JSON.parse(output));
            } catch (e) {
              reject(new Error("Invalid response from face recognition system"));
            }
          }
        }
      );
    });

    // Validate Python response
    if (!result || typeof result.success === "undefined") {
      throw new Error("Invalid response structure from Python script");
    }

    // Handle response
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message || "Attendance recorded successfully",
        data: {
          markedCount: result.marked_count || 0,
          recognizedStudents: result.recognized_students || [],
        }
      });
    } else {
      let statusCode = 400;
      let errorType = "attendance_error";
      let errorMessage = result.message || "Attendance processing failed";

      if (result.error_type === "no_faces_detected") {
        statusCode = 422;
        errorType = "no_faces_detected";
      } else if (result.error_type === "no_recognized_faces") {
        statusCode = 404;
        errorType = "no_recognized_faces";
      }

      return res.status(statusCode).json({
        success: false,
        errorType: errorType,
        message: errorMessage,
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// ---------------------------
// Get Attendance Records
// ---------------------------
router.get("/get-attendance", async (req, res) => {
  try {
    const { date } = req.query;

    // Validate date format (YYYY-MM-DD)
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Please use YYYY-MM-DD"
      });
    }

    const filePath = path.join(__dirname, '../../backend/attendance.csv');
    
    if (!fs.existsSync(filePath)) {
      return res.status(200).json({
        success: true,
        records: [],
        message: "Attendance file not found"
      });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    const records = [];
    const startIndex = lines[0].includes('student_id') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const [student_id, name, record_date, time, subject, status] = line.split(',');
      
      if (!date || record_date.trim() === date) {
        records.push({
          student_id: student_id.trim(),
          name: name.trim(),
          date: record_date.trim(),
          time: time.trim(),
          subject: subject.trim(),
          status: status.trim()
        });
      }
    }

    res.status(200).json({
      success: true,
      records,
      count: records.length
    });
  } catch (error) {
    console.error("Error processing attendance request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process attendance records"
    });
  }
});
// ---------------------------
// Get All Attendance Records
// ---------------------------
router.get("/get-all-attendance", async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../backend/attendance.csv');
    
    if (!fs.existsSync(filePath)) {
      return res.status(200).json({
        success: true,
        records: [],
        message: "Attendance file not found"
      });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(Boolean); // More concise than line => line.trim()
    
    if (lines.length === 0) {
      return res.status(200).json({
        success: true,
        records: [],
        message: "Attendance file is empty"
      });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const records = lines.slice(1)
      .filter(Boolean)
      .map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index]?.trim() || '';
          return obj;
        }, {});
      });

    return res.status(200).json({
      success: true,
      records,
      count: records.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process attendance records",
      error: error.message
    });
  }
});

module.exports = router;
