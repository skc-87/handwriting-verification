const { execFile } = require("child_process");
const util = require("util");
const path = require("path");
const fs = require("fs");

const execFileAsync = util.promisify(execFile);

const TEMP_DIR = path.join(__dirname, "../../backend/temp");
const PYTHON_SCRIPT = path.join(
  __dirname,
  "../../model_for_face/face_recognition_system.py"
);

const VALID_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png);base64,/;

const ensureTempDir = async () => {
  await fs.promises.mkdir(TEMP_DIR, { recursive: true });
};

const saveBase64Image = async (base64Image, filename) => {
  const base64Data = base64Image.replace(VALID_IMAGE_REGEX, "");
  const filePath = path.join(TEMP_DIR, filename);
  await fs.promises.writeFile(filePath, base64Data, "base64");
  console.log("Image saved:", filename);
  return filePath;
};

const runPython = async (args, timeout = 60000) => {
  console.log("Python started:", args[0]);
  const start = Date.now();

  const { stdout } = await execFileAsync("python", [PYTHON_SCRIPT, ...args], {
    timeout,
  });

  console.log("Python finished in", Date.now() - start, "ms");

  return JSON.parse(stdout.trim());
};

const extractToken = (req) =>
  req.headers.authorization?.split(" ")[1] || "";

const deleteFileIfExists = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log("Deleted raw image:", path.basename(filePath));
    }
  } catch (err) {
    console.error("Failed to delete file:", err.message);
  }
};

const faceController = {
  registerFace: async (req, res) => {
    console.log("[REGISTER] Start");

    let rawImagePath = null;

    try {
      const { student_id, name, image } = req.body;
      const token = extractToken(req);

      if (!student_id || !name || !image || !token) {
        return res.status(400).json({ success: false, message: "Missing fields" });
      }

      if (!VALID_IMAGE_REGEX.test(image)) {
        return res.status(400).json({ success: false, message: "Invalid image" });
      }

      await ensureTempDir();

      const ext = image.split(";")[0].split("/")[1];
      rawImagePath = await saveBase64Image(
        image,
        `${student_id}_${Date.now()}.${ext}`
      );

      const result = await runPython(
        ["register", student_id, name, rawImagePath, token],
        90000
      );

      // Expect Python to return processed image path
      if (result.processed_image_path) {
        console.log("Processed image:", result.processed_image_path);
      }

      // Delete original raw image
      await deleteFileIfExists(rawImagePath);

      console.log("[REGISTER] Done");
      return res.status(result.success ? 200 : 400).json(result);

    } catch (err) {
      console.error("[REGISTER ERROR]", err.message);
      if (rawImagePath) await deleteFileIfExists(rawImagePath);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  takeAttendance: async (req, res) => {
    console.log("[ATTENDANCE] Start");

    let rawImagePath = null;

    try {
      const { subject, image, date } = req.body;
      const token = extractToken(req);

      if (!subject || !image || !date || !token) {
        return res.status(400).json({ success: false, message: "Missing fields" });
      }

      if (!VALID_IMAGE_REGEX.test(image)) {
        return res.status(400).json({ success: false, message: "Invalid image" });
      }

      await ensureTempDir();

      const ext = image.split(";")[0].split("/")[1];
      rawImagePath = await saveBase64Image(
        image,
        `attendance_${Date.now()}.${ext}`
      );

      const result = await runPython(
        ["attendance", subject, rawImagePath, date, token],
        60000
      );

      if (result.processed_image_path) {
        console.log("Processed image:", result.processed_image_path);
      }

      // Delete original raw image
      await deleteFileIfExists(rawImagePath);

      console.log("[ATTENDANCE] Done");
      return res.status(result.success ? 200 : 400).json(result);

    } catch (err) {
      console.error("[ATTENDANCE ERROR]", err.message);
      if (rawImagePath) await deleteFileIfExists(rawImagePath);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};

module.exports = faceController;