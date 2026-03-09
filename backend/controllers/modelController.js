const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const FileModel = require('../models/File');
const mongoose = require('mongoose');

const isValidStudentId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9]{1,24}$/.test(id);
};

const runPythonScript = (scriptPath, args = [], envVars = {}) => {
  return new Promise((resolve) => {
    execFile("python", [scriptPath, ...args], { env: { ...process.env, ...envVars } }, (error, stdout, stderr) => {
      if (error) console.error(`[Python Error] ${error.message}`);
      if (stderr) console.error(`[Python STDERR] ${stderr.substring(0, 500)}`);
      let result;
      try { result = JSON.parse(stdout.trim()); }
      catch (parseError) { result = { status: "error", message: "Python script failed" }; }
      resolve(result);
    });
  });
};

const getFriendlyErrorMessage = (errorCode) => {
  const errorMessages = {
    "handwriting_sample_not_found": "Handwriting sample not found. Please upload it first.",
    "assignment_not_found": "Assignment not found. Please upload the assignment file.",
    "failed_to_save_sample": "Failed to process the handwriting sample.",
    "failed_to_save_assignment": "Failed to process the assignment file.",
    "mongodb_not_set": "Server configuration error.",
    "database_connection_failed": "Could not connect to the database.",
    "record_not_found": "Attendance record not found.",
    "invalid_status": "Invalid status value. Must be 'Present' or 'Absent'.",
    "update_failed": "Failed to update attendance record.",
  };
  return errorMessages[errorCode] || errorCode.replace(/_/g, " ") || "An unknown error occurred.";
};

async function deleteAssignmentFromDB(studentId) {
  try {
    console.log(`Deleting assignment for student ${studentId} from DB`);
    const deleted = await FileModel.findOneAndDelete(
      { studentId, fileCategory: "assignment" },
      { sort: { uploadDate: -1 } }
    );
    if (deleted) console.log(`Deleted assignment file: ${deleted.fileName}`);
    else console.log(`No assignment found to delete for student ${studentId}`);
  } catch (err) {
    console.error(`Failed to delete assignment for student ${studentId}:`, err.message);
  }
}

const modelController = {
  fetchFilePath: async (req, res) => {
    const { student_id, fileCategory } = req.body;
    const authToken = req.headers.authorization?.split(" ")[1];
    if (!authToken || !student_id || !fileCategory) {
      return res.status(400).json({ status: "error", message: "Missing required fields" });
    }
    if (!isValidStudentId(student_id)) {
      return res.status(400).json({ status: "error", message: "Invalid student ID format" });
    }
    const allowedCategories = ["handwriting_sample", "assignment", "all"];
    if (!allowedCategories.includes(fileCategory)) {
      return res.status(400).json({ status: "error", message: "Invalid file category" });
    }
    try {
      const fetchScript = path.join(__dirname, "../../model/fetch_file.py");
      const result = await runPythonScript(fetchScript, [student_id, fileCategory], { AUTH_TOKEN: authToken });
      if (result.status !== "success") {
        return res.status(400).json({ status: "error", message: result.message || "File fetch failed" });
      }
      res.json({ status: "success", message: "Files fetched successfully", files: result.files });
    } catch (error) {
      res.status(400).json({ status: "error", message: getFriendlyErrorMessage(error.message) });
    }
  },

  compareHandwriting: async (req, res) => {
    const { studentId } = req.params;
    const authToken = req.headers.authorization?.split(" ")[1];
    if (!authToken || !studentId) {
      return res.status(400).json({ status: "error", message: "Missing student ID or token" });
    }
    if (!isValidStudentId(studentId)) {
      return res.status(400).json({ status: "error", message: "Invalid student ID format" });
    }
    if (req.user.role === "student" && req.user.id !== studentId) {
      return res.status(403).json({ status: "error", message: "You can only compare your own handwriting." });
    }
    try {
      const fetchScript = path.join(__dirname, "../../model/fetch_file.py");
      const compareScript = path.join(__dirname, "../../model/compare_handwriting.py");
      console.log(`[Step 1/2] Fetching files for student: ${studentId}`);
      const fetchResult = await runPythonScript(fetchScript, [studentId, "all"], { AUTH_TOKEN: authToken });
      if (fetchResult.status !== "success") {
        const isMissingSample = (fetchResult.message || "").toLowerCase().includes("handwriting_sample_not_found")
          || (fetchResult.message || "").toLowerCase().includes("handwriting sample not found");
        let deleted = false;
        if (!isMissingSample) { await deleteAssignmentFromDB(studentId); deleted = true; }
        return res.status(400).json({ status: fetchResult.status || "error", message: fetchResult.message || "File fetch failed.", deleted, ...fetchResult });
      }
      console.log(`[Step 2/2] Comparing handwriting for student: ${studentId}`);
      const compareResult = await runPythonScript(compareScript, ["--student_id", studentId]);
      if (compareResult.status === "success" && !compareResult.matched) {
        await deleteAssignmentFromDB(studentId);
        return res.status(400).json({ status: "mismatch", message: compareResult.message || "Handwriting mismatch. Assignment deleted.", deleted: true, ...compareResult });
      }
      if (compareResult.status !== "success") {
        await deleteAssignmentFromDB(studentId);
        return res.status(400).json({ status: compareResult.status || "error", message: compareResult.message || "Handwriting comparison failed.", deleted: true, ...compareResult });
      }
      return res.json({ status: "success", message: "Handwriting comparison completed successfully", ...compareResult });
    } catch (error) {
      console.error(`[Error] Compare handwriting failed for student ${studentId}:`, error.message);
      await deleteAssignmentFromDB(studentId);
      return res.status(500).json({ status: "error", message: "Unexpected server error during handwriting comparison.", deleted: true });
    }
  }
};

module.exports = { modelController, runPythonScript, getFriendlyErrorMessage, deleteAssignmentFromDB };