import { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FileUploadForm from "../components/FileUploadForm";
import HandwritingSamplesTable from "../components/HandwritingSamplesTable";
import AssignmentsTable from "../components/AssignmentsTable";
import FaceRegistrationModule from "../components/FaceRegistrationModule";
import ClassAttendanceModule from "../components/ClassAttendanceModule";

const TeacherDashboard = () => {
  const API_BASE_URL = "http://localhost:5000/api/files";
  const FACE_API_URL = "http://localhost:5000/api/model";
  
  const [handwritingSamples, setHandwritingSamples] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const token = sessionStorage.getItem("authToken");

  
  // Function to handle evaluation (marks saving)
  const handleEvaluate = async (fileId, marks) => {
    try {
      await axios.put(
        `${API_BASE_URL}/evaluate/${fileId}`,
        { marks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Marks saved successfully!");
      fetchFiles(); // Refresh files after evaluation
    } catch (error) {
      toast.error(error.response?.data?.message || "Oops! Something went wrong while saving marks.");
    }
  };

  // Handle file upload: checks if all the necessary info is provided
  const handleUpload = async ({ studentId, studentName, file }) => {
    if ((!studentId && !studentName) || !file) {
      toast.error("Oops! Please provide either Student ID or Name, and make sure to select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("studentId", studentId);
    formData.append("file", file);
    formData.append("fileCategory", "handwriting_sample");
    formData.append("studentName", studentName);

    setIsUploading(true); // Show loading indicator while uploading
    try {
      await axios.post(`${API_BASE_URL}/upload/teacher`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("File uploaded successfully!");
      fetchFiles(); // Refresh the file list after successful upload
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false); // Hide loading after operation completes
    }
  };

  // Fetch all files (handwriting samples and assignments)
  const fetchFiles = async () => {
    setIsLoading(true); // Start loading spinner
    try {
      const res = await axios.get(`${API_BASE_URL}/all-files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHandwritingSamples(res.data.handwritingSamples || []);
      setAssignments(res.data.assignments || []);
      toast.success(
        `Successfully retrieved ${res.data.handwritingSamples?.length || 0} handwriting samples and ${res.data.assignments?.length || 0} assignments.`
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching files. Please try again.");
    } finally {
      setIsLoading(false); // Hide loading spinner once data is fetched
    }
  };

  // Fetch files when the component loads
  useEffect(() => {
    fetchFiles();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Main Dashboard Card with Gradient Border */}
        <div className="relative p-0.5 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-8 shadow-lg">
          <div className="bg-white rounded-xl p-6">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-center mb-8">
              Teacher Dashboard
            </h1>
  
            {/* Face Registration Module with Gradient Border */}
            <div className="relative p-0.5 rounded-xl bg-gradient-to-r from-blue-400 to-purple-400 mb-8 group hover:shadow-lg transition-shadow duration-300">
              <div className="bg-white rounded-xl p-6">
                <FaceRegistrationModule token={token} apiUrl={FACE_API_URL} />
              </div>
            </div>
  
            {/* Attendance Module with Gradient Border */}
            <div className="relative p-0.5 rounded-xl bg-gradient-to-r from-green-400 to-blue-400 mb-8 group hover:shadow-lg transition-shadow duration-300">
              <div className="bg-white rounded-xl p-6">
                <ClassAttendanceModule token={token} apiUrl={FACE_API_URL} />
              </div>
            </div>
  
            {/* File Upload Form with Gradient Border */}
            <div className="relative p-0.5 rounded-xl bg-gradient-to-r from-blue-300 to-green-400 mb-8 group hover:shadow-lg transition-shadow duration-300">
              <div className="bg-white rounded-xl p-6">
                <FileUploadForm onUpload={handleUpload} isLoading={isUploading} />
              </div>
            </div>
  
            {/* Search Bar with Gradient Border */}
            <div className="relative max-w-5xl mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-300 to-purple-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              <input
                type="text"
                placeholder="Search by student name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 shadow-sm transition-all duration-300 hover:shadow-md"
              />
            </div>
  
            {/* Assignments Table with Gradient Border */}
            <div className="relative p-0.5 rounded-xl bg-gradient-to-r from-indigo-400 to-purple-400 mb-8 group hover:shadow-lg transition-shadow duration-300">
              <div className="bg-white rounded-xl p-6">
                <AssignmentsTable
                  data={assignments}
                  isLoading={isLoading}
                  API_BASE_URL={API_BASE_URL}
                  searchTerm={searchTerm}
                  handleEvaluate={handleEvaluate}
                />
              </div>
            </div>
  
            {/* Handwriting Samples Table with Gradient Border */}
            <div className="relative p-0.5 rounded-xl bg-gradient-to-r from-pink-400 to-red-400 group hover:shadow-lg transition-shadow duration-300">
              <div className="bg-white rounded-xl p-6">
                <HandwritingSamplesTable
                  data={handwritingSamples}
                  isLoading={isLoading}
                  API_BASE_URL={API_BASE_URL}
                  searchTerm={searchTerm}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default TeacherDashboard;