const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const eventController = require("../controllers/eventController");
const router = express.Router();

// Event routes
router.post("/create", authMiddleware, eventController.createEvent);
router.post("/:eventId/generate-passes", authMiddleware, eventController.generatePasses);
router.post("/validate-qr", authMiddleware, eventController.validateQR);
router.get("/", authMiddleware, eventController.getAllEvents);
router.get("/:eventId/passes", authMiddleware, eventController.getEventPasses);
router.get("/students/list", authMiddleware, eventController.getAllStudents);

module.exports = router;