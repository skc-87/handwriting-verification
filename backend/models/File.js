const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  fileCategory: { type: String, enum: ['handwriting_sample', 'assignment'], required: true },
  fileName: { type: String, required: true },
  fileData: { type: Buffer, required: true }, // Store actual binary data
  contentType: { type: String, required: true }, // image/png, application/pdf, etc.
  uploadDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model('File', fileSchema);
