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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold text-blue-600 text-center mb-6">
          Teacher Dashboard
        </h1>

        <FaceRegistrationModule token={token} apiUrl={FACE_API_URL} />

        <ClassAttendanceModule token={token} apiUrl={FACE_API_URL} />

        <FileUploadForm onUpload={handleUpload} isLoading={isUploading} />
        
        <div className="max-w-5xl mx-auto mt-10 mb-4 border rounded shadow">
          <input
            type="text"
            placeholder="Search by student name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded font-semibold"
          />
        </div>

        <AssignmentsTable
          data={assignments}
          isLoading={isLoading}
          API_BASE_URL={API_BASE_URL}
          searchTerm={searchTerm}
          handleEvaluate={handleEvaluate}
        />

        <HandwritingSamplesTable
          data={handwritingSamples}
          isLoading={isLoading}
          API_BASE_URL={API_BASE_URL}
          searchTerm={searchTerm}
        />
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default TeacherDashboard;
