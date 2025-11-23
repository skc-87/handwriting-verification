const { execFile } = require("child_process");
const { runPythonScript, getFriendlyErrorMessage } = require('./modelController');
const path = require("path");
const fs = require("fs");

const faceController = {
    // Register face
    registerFace: async (req, res) => {
        console.log("------ [FACE REGISTRATION API HIT] ------");
        
        const { student_id = '', name = '', image = '' } = req.body;
        const authToken = req.headers.authorization?.split(" ")[1] || '';

        // Enhanced validation with specific error messages
        const missingFields = [];
        if (!authToken) missingFields.push('authorization');
        if (!student_id) missingFields.push('student_id');
        if (!name) missingFields.push('name');
        if (!image) missingFields.push('image');

        if (missingFields.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: "Missing required fields",
                missing_fields: missingFields,
                required_fields: ["authorization", "student_id", "name", "image"]
            });
        }

        // More comprehensive image format validation
        const validImageRegex = /^data:image\/(jpeg|jpg|png);base64,/;
        if (!validImageRegex.test(image)) {
            return res.status(400).json({
                success: false,
                message: "Invalid image format. Only JPEG/JPG/PNG base64 supported",
                supported_formats: ["image/jpeg", "image/jpg", "image/png"]
            });
        }

        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, "../../backend/temp");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempImagePath = path.join(tempDir, `${student_id}_${Date.now()}.${image.split(';')[0].split('/')[1]}`);
        let tempFileCreated = false;
        
        try {
            // Validate Python script existence
            const pythonScript = path.join(__dirname, "../../model_for_face/face_recognition_system.py");
            if (!fs.existsSync(pythonScript)) {
                throw new Error("Face recognition system not found at: " + pythonScript);
            }

            // Save image with proper buffer handling
            const base64Data = image.replace(validImageRegex, "");
            await fs.promises.writeFile(tempImagePath, base64Data, 'base64');
            tempFileCreated = true;

            // Validate the image was written successfully
            const stats = await fs.promises.stat(tempImagePath);
            if (stats.size === 0) {
                throw new Error("Failed to save image file");
            }

            // Construct arguments with validation
            const args = [
                "register",
                student_id.trim(),
                name.trim(),
                tempImagePath,
                authToken
            ];

            console.log(`🔍 Executing: python ${pythonScript} register ${student_id} [name] [image_path] [token_redacted]`);

            const result = await new Promise((resolve, reject) => {
                const child = execFile("python", [pythonScript, ...args], { timeout: 90000 }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`🐍 Python Error (${error.code}): ${stderr || error.message}`);
                        const errorMsg = error.code === 'ETIMEDOUT' 
                            ? "Face recognition process timed out"
                            : `Face registration failed: ${stderr || error.message}`;
                        reject(new Error(errorMsg));
                    } else {
                        try {
                            const output = stdout.trim();
                            if (!output) {
                                throw new Error("Empty response from Python script");
                            }
                            resolve(JSON.parse(output));
                        } catch (e) {
                            console.error("Failed to parse Python output:", stdout);
                            reject(new Error("Invalid JSON response from Python script"));
                        }
                    }
                });

                child.on('exit', (code) => {
                    if (code !== 0) {
                        console.error(`Python process exited with code ${code}`);
                    }
                });
            });

            // Validate Python script response structure
            if (typeof result.success !== 'boolean') {
                throw new Error("Invalid response format from face recognition system");
            }

            // Clean up temp file after successful execution
            if (tempFileCreated) {
                fs.unlink(tempImagePath, (err) => {
                    if (err) console.error("Temp file cleanup error:", err.message);
                    else console.log("✅ Temp file cleaned up successfully");
                });
            }

            res.status(result.success ? 200 : 400).json({
                success: result.success,
                message: result.message || (result.success ? "Face registered successfully" : "Face registration failed"),
                data: result.data || null
            });

        } catch (error) {
            // Clean up temp file in case of error
            if (tempFileCreated) {
                fs.unlink(tempImagePath, (err) => {
                    if (err) console.error("Error cleaning up temp file:", err.message);
                    else console.log("✅ Temp file cleaned up after error");
                });
            }
            
            console.error("🚨 System Error:", error.message);
            res.status(500).json({
                success: false,
                message: error.message,
                error_type: error.constructor.name,
                system_error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    },

    // Take attendance
    takeAttendance: async (req, res) => {
        console.log("------ [FACE ATTENDANCE API HIT] ------");
        
        const { subject = '', image = '', date = '' } = req.body;
        const authToken = req.headers.authorization?.split(" ")[1] || '';

        // Detailed validation - add date validation
        const missingFields = [];
        if (!authToken) missingFields.push('authorization');
        if (!subject) missingFields.push('subject');
        if (!image) missingFields.push('image');
        if (!date) missingFields.push('date');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
                missing_fields: missingFields,
                required_fields: ["authorization", "subject", "image", "date"]
            });
        }

        // Enhanced image validation
        const validImageRegex = /^data:image\/(jpeg|jpg|png);base64,/;
        if (!validImageRegex.test(image)) {
            return res.status(400).json({
                success: false,
                message: "Invalid image format. Only JPEG/JPG/PNG base64 supported",
                supported_formats: ["image/jpeg", "image/jpg", "image/png"]
            });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format. Please use YYYY-MM-DD"
            });
        }

        // Ensure temp directory exists
        const tempDir = path.join(__dirname, "../../backend/temp");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const fileExtension = image.split(';')[0].split('/')[1];
        const tempImagePath = path.join(tempDir, `attendance_${Date.now()}.${fileExtension}`);
        let tempFileCreated = false;

        try {
            // Verify Python script with absolute path
            const pythonScript = path.join(__dirname, "../../model_for_face/face_recognition_system.py");
            if (!fs.existsSync(pythonScript)) {
                throw new Error(`Attendance system not found at: ${pythonScript}`);
            }

            // Save image with validation
            const base64Data = image.replace(validImageRegex, "");
            await fs.promises.writeFile(tempImagePath, base64Data, 'base64');
            tempFileCreated = true;
            
            // Verify image was saved
            const stats = await fs.promises.stat(tempImagePath);
            if (stats.size === 0) {
                throw new Error("Failed to save attendance image");
            }

            // Construct arguments with input sanitization
            const args = [
                "attendance",
                subject.trim(),
                tempImagePath,
                date.trim(),
                authToken
            ];

            console.log(`🔍 Executing: python ${pythonScript} attendance ${subject} [image_path] ${date} [token_redacted]`);

            const result = await new Promise((resolve, reject) => {
                const child = execFile(
                    "python", 
                    [pythonScript, ...args], 
                    { timeout: 30000 },
                    (error, stdout, stderr) => {
                        if (error) {
                            const errorMsg = error.code === 'ETIMEDOUT' 
                                ? "Attendance process timed out"
                                : `Attendance failed: ${stderr || error.message}`;
                            console.error(`🐍 Python Error (${error.code}): ${errorMsg}`);
                            reject(new Error(errorMsg));
                        } else {
                            try {
                                const output = stdout.trim();
                                if (!output) throw new Error("Empty response from Python script");
                                resolve(JSON.parse(output));
                            } catch (e) {
                                console.error("Failed to parse Python output:", stdout);
                                reject(new Error("Invalid response from attendance system"));
                            }
                        }
                    }
                );

                child.on('exit', (code) => {
                    if (code !== 0) {
                        console.error(`Python process exited with code ${code}`);
                    }
                });
            });

            // Validate and standardize response
            if (typeof result.success !== 'boolean') {
                throw new Error("Invalid response structure from attendance system");
            }

            // Clean up temp file after successful execution
            if (tempFileCreated) {
                fs.unlink(tempImagePath, (err) => {
                    if (err) console.error("Failed to cleanup temp image:", err.message);
                    else console.log("✅ Attendance temp file cleaned up successfully");
                });
            }

            res.status(result.success ? 200 : 400).json({
                success: result.success,
                message: result.message || (result.success ? "Attendance recorded successfully" : "Failed to record attendance"),
                data: result.data || null,
                recognized: result.recognized || [],
                unrecognized: result.unrecognized || []
            });

        } catch (error) {
            // Clean up temp file in case of error
            if (tempFileCreated) {
                fs.unlink(tempImagePath, (err) => {
                    if (err) console.error("Error cleaning up temp file:", err.message);
                    else console.log("✅ Temp file cleaned up after error");
                });
            }
            
            console.error("🚨 Attendance Error:", error.message);
            res.status(500).json({
                success: false,
                message: error.message,
                error_type: error.constructor.name,
                system_error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
};

module.exports = faceController;