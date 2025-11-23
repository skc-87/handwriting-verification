const fs = require("fs");
const path = require("path");

// Helper Function to Update Attendance CSV
const updateAttendanceCSV = (studentId, date, time, newStatus) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(__dirname, '../../backend/attendance.csv');
        
        if (!fs.existsSync(filePath)) {
            return reject(new Error("Attendance file not found"));
        }

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }

            const lines = data.split('\n');
            let updated = false;
            const updatedLines = lines.map((line, index) => {
                // Skip empty lines and header
                if (!line.trim() || index === 0) return line;
                
                const fields = line.split(',');
                if (fields.length >= 6) {
                    const lineStudentId = fields[0]?.trim();
                    const lineDate = fields[2]?.trim();
                    const lineTime = fields[3]?.trim();
                    
                    // Match by studentId, date, AND time to ensure unique record
                    if (lineStudentId === studentId && lineDate === date && lineTime === time) {
                        console.log(`📝 Found matching record: ${line}`);
                        fields[5] = newStatus; // Update status (6th field)
                        updated = true;
                        return fields.join(',');
                    }
                }
                return line;
            });

            if (!updated) {
                console.log(`❌ No record found for: ${studentId}, ${date}, ${time}`);
                return reject(new Error("record_not_found"));
            }

            fs.writeFile(filePath, updatedLines.join('\n'), 'utf8', (writeErr) => {
                if (writeErr) {
                    return reject(writeErr);
                }
                console.log(`💾 CSV file updated successfully`);
                resolve(true);
            });
        });
    });
};

const attendanceController = {
    // Update attendance status
    updateAttendanceStatus: async (req, res) => {
        console.log("------ [UPDATE ATTENDANCE STATUS API HIT] ------");
        console.log("Request Body:", req.body);
        
        const { recordId, status } = req.body;
        const authToken = req.headers.authorization?.split(" ")[1];

        // Validation
        if (!authToken) {
            return res.status(401).json({
                success: false,
                message: "Authorization token required"
            });
        }

        if (!recordId || !status) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: recordId and status are required"
            });
        }

        if (!['Present', 'Absent'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value. Must be 'Present' or 'Absent'"
            });
        }

        try {
            // Parse recordId - NEW FORMAT: "studentId_date_hour-minute-second"
            const parts = recordId.split('_');
            if (parts.length < 3) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid recordId format. Expected: studentId_date_time-with-hyphens"
                });
            }
            
            const studentId = parts[0];
            const date = parts[1];
            // Reconstruct time: "22-28-01" -> "22:28:01"
            const time = parts[2].replace(/-/g, ':');
            
            console.log(`🔍 Looking for record: ${studentId}, ${date}, ${time}`);
            
            // Update the CSV file
            await updateAttendanceCSV(studentId, date, time, status);
            
            console.log(`✅ Attendance status updated: ${studentId} on ${date} at ${time} -> ${status}`);
            
            res.status(200).json({
                success: true,
                message: "Attendance status updated successfully",
                data: {
                    recordId,
                    studentId,
                    date,
                    time,
                    status,
                    updatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error("🚨 Update Attendance Error:", error.message);
            
            if (error.message === "record_not_found") {
                return res.status(404).json({
                    success: false,
                    message: "Attendance record not found for the specified student, date, and time"
                });
            }

            res.status(500).json({
                success: false,
                message: "Failed to update attendance status",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // Get attendance records for specific date
    getAttendance: async (req, res) => {
        try {
            const { date } = req.query;

            // Validate date format (YYYY-MM-DD)
            if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date format. Please use YYYY-MM-DD"
                });
            }

            const filePath = path.join(__dirname, '../../backend/attendance.csv');
            
            if (!fs.existsSync(filePath)) {
                return res.status(200).json({
                    success: true,
                    records: [],
                    message: "Attendance file not found"
                });
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const lines = fileContent.split('\n').filter(line => line.trim());
            
            if (lines.length === 0) {
                return res.status(200).json({
                    success: true,
                    records: [],
                    message: "Attendance file is empty"
                });
            }

            const records = [];
            const startIndex = lines[0].includes('student_id') ? 1 : 0;

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;
                
                const fields = line.split(',');
                if (fields.length >= 6) {
                    const studentId = fields[0]?.trim();
                    const recordDate = fields[2]?.trim();
                    const time = fields[3]?.trim();
                    
                    // FIXED: Use hyphens instead of underscores for time
                    const _id = `${studentId}_${recordDate}_${time.replace(/:/g, '-')}`.replace(/[^a-zA-Z0-9_-]/g, '_');
                    
                    const record = {
                        _id,
                        student_id: studentId || 'N/A',
                        name: fields[1]?.trim() || 'N/A',
                        date: recordDate || 'N/A',
                        time: time || 'N/A',
                        subject: fields[4]?.trim() || 'N/A',
                        status: fields[5]?.trim() || 'N/A'
                    };
                    
                    if (!date || record.date === date) {
                        records.push(record);
                    }
                }
            }

            res.status(200).json({
                success: true,
                records,
                count: records.length
            });
        } catch (error) {
            console.error("Error processing attendance request:", error);
            res.status(500).json({
                success: false,
                message: "Failed to process attendance records"
            });
        }
    },

    // Get all attendance records
    getAllAttendance: async (req, res) => {
        try {
            const filePath = path.join(__dirname, '../../backend/attendance.csv');
            
            if (!fs.existsSync(filePath)) {
                return res.status(200).json({
                    success: true,
                    records: [],
                    message: "Attendance file not found"
                });
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const lines = fileContent.split('\n').filter(Boolean);
            
            if (lines.length === 0) {
                return res.status(200).json({
                    success: true,
                    records: [],
                    message: "Attendance file is empty"
                });
            }

            const records = [];
            const startIndex = lines[0].includes('student_id') ? 1 : 0;

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;
                
                const fields = line.split(',');
                if (fields.length >= 6) {
                    const studentId = fields[0]?.trim();
                    const recordDate = fields[2]?.trim();
                    const time = fields[3]?.trim();
                    
                    // FIXED: Use hyphens instead of underscores for time
                    const _id = `${studentId}_${recordDate}_${time.replace(/:/g, '-')}`.replace(/[^a-zA-Z0-9_-]/g, '_');
                    
                    records.push({
                        _id,
                        student_id: studentId || 'N/A',
                        name: fields[1]?.trim() || 'N/A',
                        date: recordDate || 'N/A',
                        time: time || 'N/A',
                        subject: fields[4]?.trim() || 'N/A',
                        status: fields[5]?.trim() || 'N/A'
                    });
                }
            }

            return res.status(200).json({
                success: true,
                records,
                count: records.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to process attendance records",
                error: error.message
            });
        }
    },

    // Get attendance statistics
    getAttendanceStatistics: async (req, res) => {
        try {
            const { date, subject } = req.query;
            
            const filePath = path.join(__dirname, '../../backend/attendance.csv');
            
            if (!fs.existsSync(filePath)) {
                return res.status(200).json({
                    success: true,
                    statistics: {
                        total: 0,
                        present: 0,
                        absent: 0,
                        presentPercentage: 0,
                        absentPercentage: 0,
                        bySubject: {}
                    }
                });
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const lines = fileContent.split('\n').filter(line => line.trim());
            
            if (lines.length <= 1) {
                return res.status(200).json({
                    success: true,
                    statistics: {
                        total: 0,
                        present: 0,
                        absent: 0,
                        presentPercentage: 0,
                        absentPercentage: 0,
                        bySubject: {}
                    }
                });
            }

            const statistics = {
                total: 0,
                present: 0,
                absent: 0,
                presentPercentage: 0,
                absentPercentage: 0,
                bySubject: {},
                byDate: {}
            };

            const startIndex = lines[0].includes('student_id') ? 1 : 0;

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;
                
                const fields = line.split(',');
                if (fields.length >= 6) {
                    const recordDate = fields[2]?.trim();
                    const recordSubject = fields[4]?.trim();
                    const status = fields[5]?.trim();
                    
                    // Apply filters if provided
                    if (date && recordDate !== date) continue;
                    if (subject && recordSubject !== subject) continue;
                    
                    statistics.total++;
                    
                    if (status === 'Present') {
                        statistics.present++;
                    } else if (status === 'Absent') {
                        statistics.absent++;
                    }
                    
                    // Group by subject
                    if (!statistics.bySubject[recordSubject]) {
                        statistics.bySubject[recordSubject] = { total: 0, present: 0, absent: 0 };
                    }
                    statistics.bySubject[recordSubject].total++;
                    if (status === 'Present') statistics.bySubject[recordSubject].present++;
                    if (status === 'Absent') statistics.bySubject[recordSubject].absent++;
                    
                    // Group by date
                    if (!statistics.byDate[recordDate]) {
                        statistics.byDate[recordDate] = { total: 0, present: 0, absent: 0 };
                    }
                    statistics.byDate[recordDate].total++;
                    if (status === 'Present') statistics.byDate[recordDate].present++;
                    if (status === 'Absent') statistics.byDate[recordDate].absent++;
                }
            }

            // Calculate percentages
            if (statistics.total > 0) {
                statistics.presentPercentage = ((statistics.present / statistics.total) * 100).toFixed(1);
                statistics.absentPercentage = ((statistics.absent / statistics.total) * 100).toFixed(1);
                
                // Calculate percentages for each subject
                Object.keys(statistics.bySubject).forEach(subject => {
                    const subjectStats = statistics.bySubject[subject];
                    subjectStats.presentPercentage = subjectStats.total > 0 ? ((subjectStats.present / subjectStats.total) * 100).toFixed(1) : "0";
                    subjectStats.absentPercentage = subjectStats.total > 0 ? ((subjectStats.absent / subjectStats.total) * 100).toFixed(1) : "0";
                });
                
                // Calculate percentages for each date
                Object.keys(statistics.byDate).forEach(date => {
                    const dateStats = statistics.byDate[date];
                    dateStats.presentPercentage = dateStats.total > 0 ? ((dateStats.present / dateStats.total) * 100).toFixed(1) : "0";
                    dateStats.absentPercentage = dateStats.total > 0 ? ((dateStats.absent / dateStats.total) * 100).toFixed(1) : "0";
                });
            }

            res.status(200).json({
                success: true,
                statistics,
                filters: { date, subject }
            });

        } catch (error) {
            console.error("Error generating statistics:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate attendance statistics"
            });
        }
    }
};

module.exports = attendanceController;