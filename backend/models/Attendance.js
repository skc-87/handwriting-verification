const mongoose = require('mongoose');
const AttendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  status: String, // 'Present' or 'Absent'
  date: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Attendance', AttendanceSchema);
