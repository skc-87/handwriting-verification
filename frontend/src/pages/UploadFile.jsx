import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import axios from "axios";
import CompareHandwriting from "../components/CompareHandwriting";

const UploadFile = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  const userName = sessionStorage.getItem("userName");

  // Fetch assignments for the student
  const fetchAssignments = async () => {
    setIsFetching(true);
    try {
      const token = sessionStorage.getItem("authToken");
      const response = await axios.get(
        `http://localhost:5000/api/files/student-assignments/${studentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setAssignments(response.data);
      if (response.data.length > 0) {
        toast.success(`Found ${response.data.length} assignments`, {
          autoClose: 2000,
        });
      } else {
        toast.info("No assignments found", { autoClose: 2000 });
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch assignments";
      toast.error(errorMsg);
      console.error(error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file before uploading.", {
        autoClose: 3000,
      });
      return;
    }

    const token = sessionStorage.getItem("authToken");
    if (!token) {
      toast.error("No authentication token found. Please log in.", {
        autoClose: 3000,
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileCategory", "assignment");
    formData.append("studentName", userName);

    setLoading(true);
    toast.info("Uploading your assignment...", { autoClose: false });

    try {
      const response = await axios.post(
        `http://localhost:5000/api/files/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.dismiss(); // Dismiss the uploading toast
      toast.success("Assignment uploaded successfully!", {
        render: () => (
          <div className="p-2">
            <p className="font-semibold text-green-700">Upload Successful!</p>
            <p className="text-sm">{response.data?.file?.fileName} has been uploaded</p>
          </div>
        ),
        autoClose: 3000,
      });
      setFile(null);
      fetchAssignments();
    } catch (error) {
      toast.dismiss(); // Dismiss the uploading toast
      if (error.response) {
        if (error.response.status === 401) {
          toast.error("Session expired! Please log in again.", {
            autoClose: 3000,
          });
          sessionStorage.removeItem("authToken");
          window.location.href = "/login";
        } else {
          const errorMsg = error.response.data?.message || "Upload failed!";
          toast.error(errorMsg, { autoClose: 3000 });
        }
      } else {
        toast.error("Network error. Please try again.", { autoClose: 3000 });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    if (userData && userData !== "undefined") {
      try {
        const parsed = JSON.parse(userData);
        if (parsed && parsed._id) {
          setStudentId(parsed._id);
          toast.success(`Welcome back, ${parsed.name || userName}!`, {
            autoClose: 3000,
          });
        }
      } catch (e) {
        console.error("Invalid user data in sessionStorage:", e);
        toast.error("Error loading user data", { autoClose: 2000 });
      }
    } else {
      toast.warn("No user data found", { autoClose: 2000 });
    }
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchAssignments();
    }
  }, [studentId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Student Dashboard</h2>
          <p className="text-gray-600">Manage and submit your assignments</p>
        </div>

        {/* File Upload Section */}
        <div className="mb-8 p-6 border-2 border-dashed border-gray-200 rounded-xl bg-blue-50">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              Submit New Assignment
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File (PDF, DOCX, or Images)
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col w-full h-32 border-2 border-blue-300 border-dashed hover:bg-blue-100 hover:border-blue-400 transition-all rounded-lg cursor-pointer">
                  <div className="flex flex-col items-center justify-center pt-7">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-8 h-8 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="pt-1 text-sm tracking-wider text-gray-500">
                      {file ? file.name : "Drag & drop your file here or click to browse"}
                    </p>
                  </div>
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        toast.info(`${e.target.files[0].name} selected`, {
                          autoClose: 2000,
                        });
                        setFile(e.target.files[0]);
                      }
                    }}
                    className="opacity-0"
                  />
                </label>
              </div>
            </div>
            
            <button
              onClick={handleUpload}
              className={`w-full py-3 text-white font-semibold rounded-lg flex justify-center items-center gap-2 transition-all ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
              }`}
              disabled={loading || !file}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                      d="M4 12a8 8 0 018-8v8z"
                    ></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Upload Assignment
                </>
              )}
            </button>
            
            {file && !loading && (
              <div className="mt-3 flex items-center justify-between bg-blue-100 p-2 rounded-md">
                <span className="text-sm text-blue-800 truncate">
                  Selected: {file.name}
                </span>
                <button
                  onClick={() => {
                    setFile(null);
                    toast.info("File selection cleared", { autoClose: 1500 });
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Assignments Table Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Your Assignments</h3>
            <button
              onClick={fetchAssignments}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
          
          {isFetching ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading assignments...</span>
            </div>
          ) : assignments.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map((assignment) => (
                    <tr key={assignment._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6 text-blue-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {assignment.fileName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {assignment.fileCategory}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(assignment.uploadDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(assignment.uploadDate).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assignment.marks ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Graded
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {assignment.marks ? (
                          <span className="text-green-600 font-bold">
                            {assignment.marks}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h4 className="mt-2 text-lg font-medium text-gray-700">
                No assignments submitted yet
              </h4>
              <p className="mt-1 text-gray-500">
                Upload your first assignment using the form above
              </p>
            </div>
          )}
        </div>

        {studentId && <CompareHandwriting studentId={studentId} />}
        
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </div>
  );
};

export default UploadFile;