const express = require("express");
const { modelController } = require("../controllers/modelController");
const faceController = require("../controllers/faceController");
const attendanceController = require("../controllers/attendanceController");
const router = express.Router();

// Model operations
router.post("/fetch-file-path", modelController.fetchFilePath);
router.get("/compare-handwriting/:studentId", modelController.compareHandwriting);

// Face recognition
router.post("/register-face", faceController.registerFace);
router.post("/take-attendance", faceController.takeAttendance);

// Attendance management
router.put("/update-attendance-status", attendanceController.updateAttendanceStatus);
router.get("/get-attendance", attendanceController.getAttendance);
router.get("/get-all-attendance", attendanceController.getAllAttendance);
router.get("/attendance-statistics", attendanceController.getAttendanceStatistics);

module.exports = router;