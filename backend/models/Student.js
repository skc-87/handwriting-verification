const mongoose = require('mongoose');
const StudentSchema = new mongoose.Schema({
  erpId: String,
  name: String,
  faceEncoding: [Number], // Optional for facial recognition
});
module.exports = mongoose.model('Student', StudentSchema);
