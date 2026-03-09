const { execFile } = require("child_process");
const util = require("util");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const User = require("../models/User");

const execFileAsync = util.promisify(execFile);
const TEMP_DIR = path.join(__dirname, "../../backend/temp");
const PYTHON_SCRIPT = path.join(__dirname, "../../model_for_face/face_recognition_system.py");
const VALID_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png);base64,/;
const VALID_ID_REGEX = /^[a-zA-Z0-9]+$/;
const VALID_NAME_REGEX = /^[a-zA-Z\s.'-]{1,100}$/;
const ALLOWED_EXTS = ["jpeg", "jpg", "png"];

const ensureTempDir = async () => { await fs.promises.mkdir(TEMP_DIR, { recursive: true }); };

// Clean up orphaned temp files on startup
(async () => {
  try {
    const files = await fs.promises.readdir(TEMP_DIR).catch(() => []);
    for (const file of files) await fs.promises.unlink(path.join(TEMP_DIR, file)).catch(() => {});
  } catch { /* TEMP_DIR may not exist yet */ }
})();

const saveBase64Image = async (base64Image, filename) => {
  const base64Data = base64Image.replace(VALID_IMAGE_REGEX, "");
  const filePath = path.join(TEMP_DIR, filename);
  await fs.promises.writeFile(filePath, base64Data, "base64");
  return filePath;
};

const runPython = async (args, envVars = {}, timeout = 60000) => {
  const { stdout } = await execFileAsync("python", [PYTHON_SCRIPT, ...args], {
    timeout, env: { ...process.env, ...envVars },
  });
  return JSON.parse(stdout.trim());
};

const deleteFileIfExists = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
  } catch (err) { console.error("Failed to delete file:", err.message); }
};

const faceController = {
  registerFace: async (req, res) => {
    let rawImagePath = null;
    try {
      const { name, image } = req.body;
      let { student_id } = req.body;
      const token = req.headers.authorization?.split(" ")[1] || "";
      if (student_id) student_id = student_id.trim();
      if (!student_id || !name || !image || !token) {
        return res.status(400).json({ success: false, message: "Missing fields" });
      }
      if (!mongoose.Types.ObjectId.isValid(student_id)) {
        return res.status(400).json({ success: false, message: "Invalid student ID. Please use the student's system ID." });
      }
      if (!VALID_ID_REGEX.test(student_id)) {
        return res.status(400).json({ success: false, message: "Invalid student ID format" });
      }
      if (!VALID_NAME_REGEX.test(name)) {
        return res.status(400).json({ success: false, message: "Invalid name format" });
      }
      if (!VALID_IMAGE_REGEX.test(image)) {
        return res.status(400).json({ success: false, message: "Invalid image" });
      }
      if (!mongoose.Types.ObjectId.isValid(student_id)) {
        return res.status(400).json({ success: false, message: "Invalid student ID. Please use the student's system ID." });
      }
      const studentUser = await User.findOne({ _id: student_id, role: "student", status: "approved" });
      if (!studentUser) {
        return res.status(404).json({ success: false, message: "Student not found. Please verify the ID belongs to an approved student." });
      }
      if (studentUser.name.toLowerCase().trim() !== name.toLowerCase().trim()) {
        return res.status(400).json({ success: false, message: `Name mismatch. The registered name for this ID is "${studentUser.name}".` });
      }
      const ext = image.split(";")[0].split("/")[1];
      if (!ALLOWED_EXTS.includes(ext)) {
        return res.status(400).json({ success: false, message: "Invalid image type" });
      }
      await ensureTempDir();
      rawImagePath = await saveBase64Image(image, `${student_id}_${Date.now()}.${ext}`);
      const result = await runPython(["register", student_id, name, rawImagePath], { AUTH_TOKEN: token }, 90000);
      await deleteFileIfExists(rawImagePath);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
      console.error("[REGISTER ERROR]", err.message);
      if (rawImagePath) await deleteFileIfExists(rawImagePath);
      return res.status(500).json({ success: false, message: "Face registration failed" });
    }
  },

  takeAttendance: async (req, res) => {
    let rawImagePath = null;
    try {
      const { subject, image, date } = req.body;
      const token = req.headers.authorization?.split(" ")[1] || "";
      if (!subject || !image || !date || !token) {
        return res.status(400).json({ success: false, message: "Missing fields" });
      }
      if (typeof subject !== "string" || subject.length > 100 || !/^[a-zA-Z0-9\s._-]+$/.test(subject)) {
        return res.status(400).json({ success: false, message: "Invalid subject format" });
      }
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD" });
      }
      if (!VALID_IMAGE_REGEX.test(image)) {
        return res.status(400).json({ success: false, message: "Invalid image" });
      }
      const ext = image.split(";")[0].split("/")[1];
      if (!ALLOWED_EXTS.includes(ext)) {
        return res.status(400).json({ success: false, message: "Invalid image type" });
      }
      await ensureTempDir();
      rawImagePath = await saveBase64Image(image, `attendance_${Date.now()}.${ext}`);
      const result = await runPython(["attendance", subject, rawImagePath, date], { AUTH_TOKEN: token }, 60000);
      await deleteFileIfExists(rawImagePath);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
      console.error("[ATTENDANCE ERROR]", err.message);
      if (rawImagePath) await deleteFileIfExists(rawImagePath);
      return res.status(500).json({ success: false, message: "Attendance processing failed" });
    }
  },
};

module.exports = faceController;