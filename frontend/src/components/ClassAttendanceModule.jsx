import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import React, { useRef } from 'react';
import Webcam from 'react-webcam';

const ClassAttendanceModule = ({ token, apiUrl }) => {
  const [formData, setFormData] = useState({
    subject: "", // Changed from 'class' to 'subject' to match backend
    date: new Date().toISOString().split('T')[0],
    image: "" // Added image field for face recognition
  });
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = useRef(null);

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
        image: formData.image
      };

      const response = await axios.post(
        `${apiUrl}/take-attendance`,
        payload,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          } 
        }
      );

      if (response.data.success) {
        setAttendanceData(response.data.data || []);
        toast.success(response.data.message || `Attendance recorded for ${response.data.data?.length || 0} students`);
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

  return (
    <div className="mb-8 p-6 border rounded-lg bg-white shadow-sm">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Class Attendance</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
          <select
            value={formData.subject}
            onChange={(e) => setFormData({...formData, subject: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select Subject</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Biology">Biology</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">Face Capture *</label>
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className={`px-4 py-2 rounded-md ${
              !formData.subject
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            disabled={!formData.subject}
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
              videoConstraints={{ facingMode: "user" }}
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
            onClick={() => setFormData({...formData, image: ""})}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
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
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            "Take Attendance"
          )}
        </button>
      </div>

      {attendanceData.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Attendance Results</h3>
          <div className="overflow-x-auto shadow-sm rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceData.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.studentId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.studentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === "Present" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(record.timestamp).toLocaleTimeString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <span className="mr-2">{record.confidence}%</span>
                        <div className="relative w-full">
                          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                            <div 
                              style={{ width: `${record.confidence}%` }}
                              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                record.confidence > 75 ? 'bg-green-500' : 
                                record.confidence > 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassAttendanceModule;