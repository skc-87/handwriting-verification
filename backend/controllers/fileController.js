const File = require("../models/File");

exports.uploadFile = async (req, res) => {
  const { filecategory } = req.body;
  const student_id = req.user.id;

  try {
    const existingSample = await File.findOne({ student_id, filecategory: "handwriting_sample" });

    if (filecategory === "handwriting_sample" && existingSample) {
      return res.status(400).json({ message: "You can only upload one handwriting sample" });
    }

    const file = new File({
      student_id,
      filepath: req.file.path,
      filetype: req.file.mimetype,
      filename: req.file.filename,
      filecategory,
    });

    await file.save();
    res.json({ message: "File uploaded successfully", file });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
