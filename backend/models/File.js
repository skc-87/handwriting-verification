const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filepath: { type: String, required: true },
  filetype: { type: String, required: true },
  filename: { type: String, required: true },
  filecategory: { type: String, enum: ["handwriting_sample", "assignment"], required: true },
  uploaded_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("File", FileSchema);
