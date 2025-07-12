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
              {record.student_name || record['Student Name'] || record['student_name'] || record.Name || record.name || 'N/A'}
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
                      {record.student_name || record['Student Name'] || record['student_name'] || record.Name || record.name || 'N/A'}
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
    <div className="mb-8 p-6 rounded-lg bg-white shadow-lg border border-transparent relative overflow-hidden group hover:shadow-xl transition-all duration-300">
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-lg -z-10"></div>
      
      <h2 className="text-2xl font-bold mb-6  bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Class Attendance
      </h2>
  
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium relative transition-all duration-300 ${
            activeTab === "current" 
              ? "text-blue-600" 
              : "text-gray-500 hover:text-blue-500"
          }`}
          onClick={() => setActiveTab("current")}
        >
          Today&apos;s Attendance
          {activeTab === "current" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></span>
          )}
        </button>
        <button
          className={`py-2 px-4 font-medium relative transition-all duration-300 ${
            activeTab === "history" 
              ? "text-blue-600" 
              : "text-gray-500 hover:text-blue-500"
          }`}
          onClick={() => setActiveTab("history")}
        >
          Attendance History
          {activeTab === "history" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></span>
          )}
        </button>
      </div>
  
      {/* Attendance Form (shown only for current tab) */}
      {activeTab === "current" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 shadow-sm"
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
  
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                }}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 shadow-sm"
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
                className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                  !formData.subject || isLoading
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg"
                }`}
                disabled={!formData.subject || isLoading}
              >
                {formData.image ? "Recapture Image" : "Capture Face"}
              </button>
            </div>
          </div>
  
          {showCamera && (
            <div className="mb-6 p-4 border rounded-xl bg-gray-50 shadow-inner">
              <div className="w-full max-w-md mx-auto space-y-4">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
                  className="rounded-lg border-2 border-gray-200 w-full shadow-md"
                />
                <div className="flex space-x-3">
                  <button
                    onClick={captureImage}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-600 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    Capture
                  </button>
                  <button
                    onClick={() => setShowCamera(false)}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
  
          {formData.image && !showCamera && (
            <div className="mb-6 flex flex-col items-center">
              <div className="w-full max-w-md border-2 border-gray-200 rounded-xl p-1 mb-4 shadow-md">
                <img
                  src={formData.image}
                  alt="Captured for attendance"
                  className="w-full rounded-lg"
                />
              </div>
              <button
                onClick={() => setFormData({ ...formData, image: "" })}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-medium hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg"
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
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                isLoading || !formData.subject || !formData.image
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl"
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
        <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl shadow-inner">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Date
              </label>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 shadow-sm"
                max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]}
              />
            </div>
            <button
              onClick={() => setSearchDate("")}
              className="mt-2 md:mt-0 px-4 py-2.5 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 rounded-lg font-medium hover:from-gray-300 hover:to-gray-400 transition-all duration-300 shadow-sm hover:shadow-md"
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
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              isLoadingRecords
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-600 hover:from-blue-200 hover:to-purple-200 shadow-sm hover:shadow-md"
            }`}
          >
            Refresh
          </button>
        </div>
  
        {isLoadingRecords ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : allAttendanceRecords.length > 0 ? (
          activeTab === "current" ? renderCurrentDateTable() : renderHistoryTables()
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="inline-block p-4 bg-gray-100 rounded-full mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <p className="text-lg">
              {searchDate 
                ? `No attendance records found for ${searchDate}`
                : "No attendance records available"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassAttendanceModule;