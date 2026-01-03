const QRCode = require("qrcode");
const Event = require("../models/Event");
const EventPass = require("../models/EventPass");
const User = require("../models/User");

// Generate unique IDs
const generateEventId = () => `EVT${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
const generatePassId = () => `PASS${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

const eventController = {
  // Create Event
  createEvent: async (req, res) => {
    try {
      const { title, description, date, time, venue, organizer } = req.body;
      const createdBy = req.user.id;

      const eventId = generateEventId();
      
      // Create minimal QR data as JSON string
      const qrData = {
        eventId: eventId,
        type: "event_info",
        title: title.substring(0, 50), // Limit title length
        date: date,
        time: time,
        venue: venue.substring(0, 30) // Limit venue length
      };

      // Store as JSON string in qrCode field
      const qrCodeString = JSON.stringify(qrData);

      const event = await Event.create({
        title,
        description,
        date,
        time,
        venue,
        organizer,
        qrCode: qrCodeString, // Store as JSON string
        eventId,
        createdBy
      });

      res.status(201).json({
        success: true,
        message: "Event created successfully",
        event: event
      });
    } catch (error) {
      console.error("Event creation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create event"
      });
    }
  },

  // Generate Passes for Students
  generatePasses: async (req, res) => {
    try {
      const { eventId } = req.params;
      const { studentIds } = req.body;

      console.log(`Generating passes for event: ${eventId}, students:`, studentIds);

      const event = await Event.findOne({ eventId });
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found"
        });
      }

      const passes = [];
      const errors = [];

      for (const studentId of studentIds) {
        try {
          const student = await User.findById(studentId);
          if (!student) {
            errors.push(`Student not found: ${studentId}`);
            continue;
          }

          const existingPass = await EventPass.findOne({ 
            eventId: event._id, 
            studentId 
          });
          
          if (existingPass) {
            passes.push(existingPass);
            continue;
          }

          const passId = generatePassId();
          const passData = {
            eventId: event.eventId,
            passId: passId,
            studentId: studentId.toString(),
            studentName: student.name.substring(0, 30), // Limit name length
            type: "event_pass"
          };

          // Store as JSON string in qrCode field
          const qrCodeString = JSON.stringify(passData);

          const pass = await EventPass.create({
            eventId: event._id,
            studentId,
            qrCode: qrCodeString, // Store as JSON string
            passId: passId
          });

          const populatedPass = await EventPass.findById(pass._id)
            .populate('studentId', 'name email');

          passes.push(populatedPass);
        } catch (error) {
          console.error(`Error creating pass for student ${studentId}:`, error);
          errors.push(`Failed to create pass for student ${studentId}: ${error.message}`);
        }
      }

      res.json({
        success: true,
        message: `Generated ${passes.length} passes successfully`,
        passes: passes,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Pass generation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate passes"
      });
    }
  },

  // Get QR Code Data for Frontend
  getQRCodeData: async (req, res) => {
    try {
      const { eventId, passId } = req.query;

      if (eventId) {
        const event = await Event.findOne({ eventId });
        if (!event) {
          return res.status(404).json({
            success: false,
            message: "Event not found"
          });
        }

        // Parse the JSON string back to object
        let qrData;
        try {
          qrData = JSON.parse(event.qrCode);
        } catch (error) {
          console.error('Error parsing event QR data:', error);
          // If parsing fails, create new QR data
          qrData = {
            eventId: event.eventId,
            type: "event_info",
            title: event.title.substring(0, 50),
            date: event.date,
            time: event.time
          };
        }

        return res.json({
          success: true,
          qrData: qrData,
          type: "event",
          event: {
            title: event.title,
            date: event.date,
            time: event.time,
            venue: event.venue
          }
        });
      }

      if (passId) {
        const pass = await EventPass.findOne({ passId })
          .populate('eventId', 'title date time venue')
          .populate('studentId', 'name email');

        if (!pass) {
          return res.status(404).json({
            success: false,
            message: "Pass not found"
          });
        }

        // Parse the JSON string back to object
        let qrData;
        try {
          qrData = JSON.parse(pass.qrCode);
        } catch (error) {
          console.error('Error parsing pass QR data:', error);
          // If parsing fails, create new QR data
          qrData = {
            eventId: pass.eventId.eventId,
            passId: pass.passId,
            studentId: pass.studentId._id.toString(),
            studentName: pass.studentId.name.substring(0, 30),
            type: "event_pass"
          };
        }

        return res.json({
          success: true,
          qrData: qrData,
          type: "pass",
          pass: {
            studentName: pass.studentId?.name,
            studentEmail: pass.studentId?.email,
            eventTitle: pass.eventId?.title,
            eventDate: pass.eventId?.date,
            eventTime: pass.eventId?.time
          }
        });
      }

      return res.status(400).json({
        success: false,
        message: "Either eventId or passId is required"
      });
    } catch (error) {
      console.error("Get QR data error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get QR code data"
      });
    }
  },

  // Fix existing corrupted QR codes
  fixQRCode: async (req, res) => {
    try {
      const { eventId, passId } = req.body;

      if (eventId) {
        const event = await Event.findOne({ eventId });
        if (!event) {
          return res.status(404).json({
            success: false,
            message: "Event not found"
          });
        }

        // Create new QR data
        const qrData = {
          eventId: event.eventId,
          type: "event_info",
          title: event.title.substring(0, 50),
          date: event.date,
          time: event.time,
          venue: event.venue.substring(0, 30)
        };

        // Update with proper JSON string
        event.qrCode = JSON.stringify(qrData);
        await event.save();

        return res.json({
          success: true,
          message: "QR code fixed successfully",
          qrData: qrData
        });
      }

      if (passId) {
        const pass = await EventPass.findOne({ passId })
          .populate('studentId', 'name email');
        
        if (!pass) {
          return res.status(404).json({
            success: false,
            message: "Pass not found"
          });
        }

        // Create new QR data
        const qrData = {
          eventId: pass.eventId.eventId,
          passId: pass.passId,
          studentId: pass.studentId._id.toString(),
          studentName: pass.studentId.name.substring(0, 30),
          type: "event_pass"
        };

        // Update with proper JSON string
        pass.qrCode = JSON.stringify(qrData);
        await pass.save();

        return res.json({
          success: true,
          message: "QR code fixed successfully",
          qrData: qrData
        });
      }

      return res.status(400).json({
        success: false,
        message: "Either eventId or passId is required"
      });
    } catch (error) {
      console.error("Fix QR code error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fix QR code"
      });
    }
  },

  // Validate QR Code
  validateQR: async (req, res) => {
    try {
      const { qrData } = req.body;
      const scannedBy = req.user.id;

      console.log("Validating QR data:", qrData);

      let parsedData;
      try {
        parsedData = JSON.parse(qrData);
      } catch (error) {
        return res.status(400).json({
          valid: false,
          message: "Invalid QR code format"
        });
      }

      const { type, eventId, passId } = parsedData;

      if (type === "event_pass") {
        const pass = await EventPass.findOne({ passId })
          .populate('eventId')
          .populate('studentId', 'name email');

        if (!pass) {
          return res.json({
            valid: false,
            message: "Invalid pass"
          });
        }

        if (pass.isUsed) {
          return res.json({
            valid: false,
            message: "Pass already used"
          });
        }

        pass.isUsed = true;
        pass.usedAt = new Date();
        pass.scannedBy = scannedBy;
        await pass.save();

        return res.json({
          valid: true,
          message: "Pass validated successfully",
          data: {
            studentName: pass.studentId.name,
            studentEmail: pass.studentId.email,
            eventTitle: pass.eventId.title,
            eventDate: pass.eventId.date,
            eventTime: pass.eventId.time,
            venue: pass.eventId.venue
          }
        });
      } else if (type === "event_info") {
        const event = await Event.findOne({ eventId });
        if (!event) {
          return res.json({
            valid: false,
            message: "Event not found"
          });
        }

        return res.json({
          valid: true,
          message: "Event QR code",
          data: {
            eventTitle: event.title,
            eventDate: event.date,
            eventTime: event.time,
            venue: event.venue,
            organizer: event.organizer
          }
        });
      } else {
        return res.json({
          valid: false,
          message: "Unknown QR code type"
        });
      }
    } catch (error) {
      console.error("QR validation error:", error);
      res.status(500).json({
        valid: false,
        message: "Validation error"
      });
    }
  },

  // Get All Events
  getAllEvents: async (req, res) => {
    try {
      const events = await Event.find({ createdBy: req.user.id })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        events
      });
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch events"
      });
    }
  },

  // Get Event Passes
  getEventPasses: async (req, res) => {
    try {
      const { eventId } = req.params;
      
      const event = await Event.findOne({ eventId });
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found"
        });
      }

      const passes = await EventPass.find({ eventId: event._id })
        .populate('studentId', 'name email')
        .populate('scannedBy', 'name')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        passes
      });
    } catch (error) {
      console.error("Get passes error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch passes"
      });
    }
  },

  // Get All Students for Pass Generation
  getAllStudents: async (req, res) => {
    try {
      const students = await User.find({ role: 'student' })
        .select('_id name email')
        .sort({ name: 1 });

      res.json({
        success: true,
        students
      });
    } catch (error) {
      console.error("Get students error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch students"
      });
    }
  }
};

module.exports = eventController;