const express = require("express");
const multer = require("multer");
const { uploadFile } = require("../controllers/fileController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Use in-memory storage (to store file directly in MongoDB as Buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Upload File API (Works for both sample and assignment)
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  (req, res, next) => {
    console.log("------ [UPLOAD API HIT] ------");
    console.log("Request body:", req.body);
    console.log("File info:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded!" });
    }
    next();
  },
  uploadFile
);


module.exports = router;
