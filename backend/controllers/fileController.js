const File = require("../models/File");

exports.uploadFile = async (req, res) => {
  console.log("[UPLOAD] uploadFile function triggered");

  const { fileCategory } = req.body;
  const studentId = req.user?.id;

  console.log("[UPLOAD] Student ID:", studentId);
  console.log("[UPLOAD] File Category:", fileCategory);
  console.log("[UPLOAD] Request File:", req.file);

  try {
    if (!req.file) {
      console.log("[UPLOAD] No file received in request");
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Only update existing sample if it's handwriting_sample
    if (fileCategory === "handwriting_sample") {
      const existingSample = await File.findOne({ studentId, fileCategory });

      if (existingSample) {
        console.log("[UPLOAD] Replacing existing handwriting sample...");

        existingSample.fileData = req.file.buffer;
        existingSample.fileName = req.file.originalname;
        existingSample.contentType = req.file.mimetype;

        await existingSample.save();

        console.log("[UPLOAD] Handwriting sample updated successfully!");
        return res.status(200).json({
          message: "Handwriting sample updated successfully!",
          file: existingSample,
        });
      }
    }

    // Save new file (for assignment or new sample)
    const newFile = new File({
      studentId,
      fileCategory,
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      fileData: req.file.buffer,
    });

    await newFile.save();
    console.log("[UPLOAD] New file saved successfully:", newFile);

    res
      .status(201)
      .json({ message: "File uploaded successfully!", file: newFile });
  } catch (error) {
    console.error("[UPLOAD ERROR]", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
