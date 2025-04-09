import { useEffect, useState } from "react";

import axios from "axios";
import CompareHandwriting from "../components/CompareHandwriting";

const UploadFile = () => {
  const [file, setFile] = useState(null);
  const [fileCategory, setFileCategory] = useState("handwriting_sample");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [fetchedFiles, setFetchedFiles] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [fetchStatus, setFetchStatus] = useState("");

  // 🧠 Fetch button handler (calls Python model via local server or subprocess later)
  const handleFetchFile = async () => {
    setFetchStatus("Fetching...");
    const token = sessionStorage.getItem("authToken");

    try {
      const response = await fetch(
        "http://localhost:5000/api/model/fetch-file-path",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            student_id: studentId,
            fileCategory,
          }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        if (data.files && data.files.length > 0) {
          setFetchedFiles(data.files); // Save array of fetched file paths
          setFetchStatus(
            "✅ File fetched successfully! "
          );
        } else {
          setFetchStatus("⚠️ No files found.");
        }
      } else {
        setFetchStatus("❌ " + data.message);
      }
    } catch (err) {
      setFetchStatus("❌ Server error while fetching file.");
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file before uploading.");
      return;
    }

    const token = sessionStorage.getItem("authToken");
    if (!token) {
      setError("No authentication token found. Please log in.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileCategory", fileCategory);

    setLoading(true);
    setError(null);
    setSuccessMessage("");

    try {
      await axios.post(`http://localhost:5000/api/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccessMessage("File uploaded successfully!");
      setFile(null); // Reset file input
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          setError("Session expired! Please log in again.");
          sessionStorage.removeItem("authToken");
          window.location.href = "/login"; // Redirect to login page
        } else {
          setError(error.response.data.message || "Upload failed!");
        }
      } else {
        setError("An error occurred during the upload. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = sessionStorage.getItem("user");

    // ✅ Check if userData exists and is not the string "undefined"
    if (userData && userData !== "undefined") {
      try {
        const parsed = JSON.parse(userData);
        if (parsed && parsed._id) {
          setStudentId(parsed._id);
        } else {
          console.warn("User data missing _id field:", parsed);
        }
      } catch (e) {
        console.error("❌ Invalid user data in sessionStorage:", e);
      }
    } else {
      console.warn("⚠️ No valid user data found in sessionStorage.");
    }
  }, []);

  const handleDownload = (filePath) => {
    const fileName = filePath.split("/").pop();
    const downloadUrl = `http://localhost:5000/download/${fileName}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-semibold text-center mb-6">Upload File</h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {successMessage && (
          <p className="text-green-500 text-sm mb-4">{successMessage}</p>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select File
          </label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select File Type
          </label>
          <select
            value={fileCategory}
            onChange={(e) => setFileCategory(e.target.value)}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="handwriting_sample">Handwriting Sample</option>
            <option value="assignment">Assignment</option>
          </select>
        </div>

        <button
          onClick={handleUpload}
          className={`w-full py-2 text-white font-semibold rounded-md ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } transition duration-300`}
          disabled={loading}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>

        <hr className="my-6" />

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Student ID to Fetch File
          </label>
          <input
            type="text"
            placeholder="Enter Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            readOnly
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <button
          onClick={handleFetchFile}
          className="w-full py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition duration-300"
        >
          Fetch File for AI Model
        </button>

        {fetchStatus && <p className="text-sm mt-3">{fetchStatus}</p>}

        {fetchedFiles.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2 text-gray-700">
              Fetched Files:
            </h3>
            <ul className="space-y-2">
              {fetchedFiles.map((filePath, index) => {
                const fileName = filePath.split("/").pop();
                return (
                  <li
                    key={index}
                    className="flex justify-between items-center bg-gray-100 p-2 rounded-md"
                  >
                    <span className="text-sm truncate">{fileName}</span>
                    <button
                      onClick={() => handleDownload(filePath)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                    >
                      Download
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {studentId && <CompareHandwriting studentId={studentId} />}
      </div>
    </div>
  );
};

export default UploadFile;
