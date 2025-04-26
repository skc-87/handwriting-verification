import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import React, { useRef } from "react";
import Webcam from "react-webcam";

const ClassAttendanceModule = ({ token, apiUrl }) => {
  // Helper function to get current local date in YYYY-MM-DD format
  const getCurrentLocalDate = () => {
    const today = new Date();
    // Adjust for timezone offset to get local date
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    return localDate.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    subject: "",
    date: getCurrentLocalDate(), // Now uses local date
    image: "",
  });
  
  const [allAttendanceRecords, setAllAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [searchDate, setSearchDate] = useState("");
  const [activeTab, setActiveTab] = useState("current");
  const webcamRef = useRef(null);

  // Force date refresh when component mounts
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      date: getCurrentLocalDate()
    }));
  }, []);


  useEffect(() => {
    if (activeTab === "history") {
      fetchAllAttendanceRecords();
    } else {
      fetchAttendanceRecords();
    }
  }, [activeTab, formData.date]);

  const fetchAttendanceRecords = async () => {
    try {
      setIsLoadingRecords(true);
      const response = await axios.get(
        `${apiUrl}/get-attendance?date=${formData.date}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        const records = normalizeAttendanceData(response.data.records);
        setAllAttendanceRecords(records);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance records");
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const fetchAllAttendanceRecords = async () => {
    try {
      setIsLoadingRecords(true);
      const response = await axios.get(
        `${apiUrl}/get-all-attendance`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('API Response:', response.data);
      
      if (response.data.success) {
        const records = normalizeAttendanceData(response.data.records);
        setAllAttendanceRecords(records);
        toast.success(`Loaded ${records.length} attendance records`);
      } else {
        toast.error(response.data.message || "Failed to load records");
      }
    }  catch (error) {
      console.error("Full error details:", {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack
      });
      toast.error(
        error.response?.data?.message || 
        "Failed to load attendance history. Please check the console for details."
      );
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const normalizeAttendanceData = (data) => {
    if (!data) return [];
    
    if (typeof data === 'object' && !Array.isArray(data)) {
      return Object.values(data);
    }
    
    if (typeof data === 'string') {
      const lines = data.split('\n');
      const headers = lines[0].split(',');
      return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
          obj[header.trim()] = values[index] ? values[index].trim() : '';
          return obj;
        }, {});
      });
    }
    
    return data || [];
  };

  const groupRecordsByDate = () => {
    const grouped = {};
    allAttendanceRecords.forEach(record => {
      const date = record.date || record['Date'];
      if (!date) return;
      
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(record);
    });
    return grouped;
  };

  const getFilteredRecords = () => {
    const grouped = groupRecordsByDate();
    
    if (searchDate) {
      return { [searchDate]: grouped[searchDate] || [] };
    }
    
    return grouped;
  };

  const captureImage = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error("Unable to capture image");
      return;
    }
    setFormData({ ...formData, image: imageSrc });
    setShowCamera(false);
    toast.success("Image captured successfully");
  };

  const handleTakeAttendance = async () => {
    if (!formData.subject) {
      toast.error("Please select a subject");
      return;
    }
    if (!formData.image) {
      toast.error("Please capture an image for attendance");
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        subject: formData.subject,
        image: formData.image,
        date: formData.date
      };

      const response = await axios.post(`${apiUrl}/take-attendance`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        await fetchAttendanceRecords();
        toast.success(
          response.data.message ||
            `Attendance recorded for ${response.data.recognized_students?.length || 0} students`
        );
      } else {
        toast.error(response.data.message || "Attendance recording failed");
      }
    } catch (error) {
      console.error("Attendance error:", error);
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to record attendance. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentDateTable = () => (
    <div className="overflow-x-auto shadow-sm rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Student ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subject
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {allAttendanceRecords.map((record, index) => (
            <tr 
              key={index} 
              className={`hover:bg-gray-50 ${record.status === 'Absent' ? 'bg-red-50' : ''}`}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {record.student_id || record['Student ID'] || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {record.student_name || record['Student Name'] || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {record.time || record['Time'] || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {record.subject || record['Subject'] || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  (record.status || record['Status']) === "Present" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {record.status || record['Status'] || 'N/A'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderHistoryTables = () => {
    const groupedRecords = getFilteredRecords();
    
    return (
      <div className="space-y-6">
        {Object.entries(groupedRecords).map(([date, records]) => (
          <div key={date} className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
              <h4 className="font-medium text-gray-800">
                {new Date(date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h4>
              <span className="text-sm text-gray-500">
                {records.length} {records.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record, index) => (
                    <tr 
                      key={`${date}-${index}`} 
                      className={`hover:bg-gray-50 ${record.status === 'Absent' ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {record.student_id || 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {record.student_name || 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {record.time || 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {record.subject || 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.status === "Present" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {record.status || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {Object.keys(groupedRecords).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchDate 
              ? `No attendance records found for ${searchDate}`
              : "No attendance records available"}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-8 p-6 border rounded-lg bg-white shadow-sm">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">
        Class Attendance
      </h2>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 font-medium ${activeTab === "current" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("current")}
        >
          Today's Attendance
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === "history" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("history")}
        >
          Attendance History
        </button>
      </div>

      {/* Attendance Form (shown only for current tab) */}
      {activeTab === "current" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isLoading}
              >
                <option value="">Select Subject</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                max={new Date().toISOString().split("T")[0]}
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Face Capture *
              </label>
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className={`px-4 py-2 rounded-md ${
                  !formData.subject || isLoading
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                disabled={!formData.subject || isLoading}
              >
                {formData.image ? "Recapture Image" : "Capture Face"}
              </button>
            </div>
          </div>

          {showCamera && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <div className="w-full max-w-md mx-auto space-y-3">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
                  className="rounded-md border border-gray-300 w-full"
                />
                <div className="flex space-x-3">
                  <button
                    onClick={captureImage}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Capture
                  </button>
                  <button
                    onClick={() => setShowCamera(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {formData.image && !showCamera && (
            <div className="mb-6 flex flex-col items-center">
              <div className="w-full max-w-md border border-gray-300 rounded-md p-1 mb-3">
                <img
                  src={formData.image}
                  alt="Captured for attendance"
                  className="w-full rounded-md"
                />
              </div>
              <button
                onClick={() => setFormData({ ...formData, image: "" })}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                disabled={isLoading}
              >
                Remove Image
              </button>
            </div>
          )}

          <div className="flex justify-end mb-6">
            <button
              onClick={handleTakeAttendance}
              disabled={isLoading || !formData.subject || !formData.image}
              className={`px-6 py-2 rounded-md ${
                isLoading || !formData.subject || !formData.image
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Take Attendance"
              )}
            </button>
          </div>
        </>
      )}

      {/* History Search (shown only for history tab) */}
      {activeTab === "history" && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Date
              </label>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]}
              />
            </div>
            <button
              onClick={() => setSearchDate("")}
              className="mt-2 md:mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Attendance Records Section */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {activeTab === "current" 
              ? `Attendance for ${formData.date}`
              : "Attendance History"}
          </h3>
          <button 
            onClick={activeTab === "current" ? fetchAttendanceRecords : fetchAllAttendanceRecords}
            disabled={isLoadingRecords}
            className={`px-3 py-1 rounded-md text-sm ${
              isLoadingRecords
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-100 text-blue-600 hover:bg-blue-200"
            }`}
          >
            Refresh
          </button>
        </div>

        {isLoadingRecords ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : allAttendanceRecords.length > 0 ? (
          activeTab === "current" ? renderCurrentDateTable() : renderHistoryTables()
        ) : (
          <div className="text-center py-8 text-gray-500">
            No attendance records found
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassAttendanceModule;