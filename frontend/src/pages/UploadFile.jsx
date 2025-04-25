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
          <div>
            <p className="font-semibold">Upload Successful!</p>
            <p>{response.data?.file?.fileName} has been uploaded</p>
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
          toast.success(`Welcome, ${parsed.name || userName}!`, {
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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-center mb-6">
          Student Dashboard
        </h2>

        {/* File Upload Section */}
        <div className="mb-8 p-6 border rounded-lg">
          <h3 className="text-xl font-medium mb-4 text-center">
            Upload Assignment
          </h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select File
            </label>
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
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleUpload}
            className={`w-full py-2 text-white font-semibold rounded-md flex justify-center items-center gap-2 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={loading}
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
              "Upload Assignment"
            )}
          </button>
        </div>

        {/* Assignments Table Section */}
        <div className="mb-8">
          <h3 className="text-xl font-medium mb-4">Your Assignments</h3>
          {isFetching ? (
            <div className="flex items-center justify-center p-4">
              <span className="loading loading-spinner loading-lg text-blue-500"></span>
              <span className="ml-2">Loading assignments...</span>
            </div>
          ) : assignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border text-center">File Name</th>
                    <th className="py-2 px-4 border text-center">
                      Upload Date
                    </th>
                    <th className="py-2 px-4 border text-center">Status</th>
                    <th className="py-2 px-4 border text-center">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment._id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border text-center">
                        <span
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => {
                            toast.info(`Assignment: ${assignment.fileName}`, {
                              render: () => (
                                <div>
                                  <p className="font-semibold">
                                    Assignment Details
                                  </p>
                                  <p>Name: {assignment.fileName}</p>
                                  <p>
                                    Uploaded:{" "}
                                    {new Date(
                                      assignment.uploadDate
                                    ).toLocaleString()}
                                  </p>
                                  {assignment.marks && (
                                    <p>Marks: {assignment.marks}</p>
                                  )}
                                </div>
                              ),
                              autoClose: 5000,
                            });
                          }}
                        >
                          {assignment.fileName}
                        </span>
                      </td>
                      <td className="py-2 px-4 border text-center">
                        {new Date(assignment.uploadDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-4 border text-center">
                        {assignment.marks ? (
                          <span className="text-green-600 flex items-center justify-center">
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Checked
                          </span>
                        ) : (
                          <span className="text-yellow-600">Pending</span>
                        )}
                      </td>
                      <td className="py-2 px-4 border text-center font-medium">
                        {assignment.marks || (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No assignments submitted yet.</p>
              <button
                onClick={fetchAssignments}
                className="mt-2 text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>
          )}
        </div>

        {studentId && <CompareHandwriting studentId={studentId} />}
      </div>
    </div>
  );
};

export default UploadFile;
