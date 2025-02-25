const express = require("express");
const { uploadFile } = require("../controllers/fileController");
const { authMiddleware } = require("../middleware/authMiddleware");
const multer = require("multer");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.fieldname === "handwriting_sample" ? "uploads/handwriting_samples/" : "uploads/assignments/";
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post("/upload", authMiddleware, upload.single("file"), uploadFile);

module.exports = router;
