  const express = require("express");
  const { execFile } = require("child_process");
  const path = require("path");

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


  module.exports = router;
