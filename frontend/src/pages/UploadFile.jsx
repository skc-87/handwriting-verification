import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import axios from "axios";
import CompareHandwriting from "../components/CompareHandwriting";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import StudentLibrary from "../components/StudentLibrary";

const UploadFile = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [isReadyForComparison, setIsReadyForComparison] = useState(false);

  const [eventPasses, setEventPasses] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    if (showQRModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showQRModal]);

  const onComparisonFailed = () => {
    toast.info(
      "The failed assignment file has been removed. Please upload a new one."
    );
    setIsReadyForComparison(false);
    fetchAssignments();
  };

  const fetchAssignments = async () => {
    if (!studentId) return;
    setIsFetching(true);
    try {
      const token = sessionStorage.getItem("authToken");
      const response = await axios.get(
        `http://localhost:5000/api/files/student-assignments/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAssignments(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch assignments"
      );
    } finally {
      setIsFetching(false);
    }
  };

  const fetchEventPasses = async () => {
    if (!studentId) return;
    setLoadingEvents(true);
    try {
      const token = sessionStorage.getItem("authToken");
      const response = await axios.get(
        `http://localhost:5000/api/student/events/passes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setEventPasses(response.data.passes);
      }
    } catch (error) {
      console.error("Failed to fetch event passes:", error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file before uploading.");
      return;
    }

    const token = sessionStorage.getItem("authToken");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileCategory", "assignment");
    formData.append("studentName", user?.name || "Student");

    setLoading(true);
    toast.info("Uploading your assignment...", { autoClose: 2000 });

    try {
      await axios.post(`http://localhost:5000/api/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success(
        "Assignment uploaded successfully! Ready for verification."
      );
      setFile(null);
      setIsReadyForComparison(true);
      fetchAssignments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed!");
    } finally {
      setLoading(false);
    }
  };

  const showEventQRCode = (pass) => {
    setSelectedEvent(pass);
    setShowQRModal(true);
  };

  const closeQRModal = () => {
    setShowQRModal(false);
    setSelectedEvent(null);
  };

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    const studentData = sessionStorage.getItem("student");

    if (userData && userData !== "undefined") {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        if (parsed?._id) setStudentId(parsed._id);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }

    if (studentData && studentData !== "undefined") {
      try {
        const parsed = JSON.parse(studentData);
        setStudent(parsed);
      } catch (error) {
        console.error("Error parsing student data:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchAssignments();
      fetchEventPasses();
    }
  }, [studentId]);

  return (
    <div
      className={`min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 ${
        showQRModal ? "overflow-hidden" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Student Dashboard
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Welcome, {user?.name || "Student"}!
          </p>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {student && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4 pb-3 border-b border-gray-200">
                  Student Profile
                </h2>

                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                      Name
                    </label>
                    <p className="text-lg font-semibold text-gray-800">
                      {user?.name}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
                      Email
                    </label>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
                      Mobile Number
                    </label>
                    <p className="text-lg font-semibold text-gray-800">
                      {student.mobile_number}
                    </p>
                  </div>

                  <div className="bg-orange-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">
                      Department
                    </label>
                    <p className="text-lg font-semibold text-gray-800">
                      {student.department}
                    </p>
                  </div>

                  <div className="bg-red-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-red-600 uppercase tracking-wide mb-1">
                      Year
                    </label>
                    <p className="text-lg font-semibold text-gray-800">
                      Year {student.year}
                    </p>
                  </div>

                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">
                      Books Allowed
                    </label>
                    <p className="text-lg font-semibold text-gray-800">
                      {student.max_books_allowed}
                    </p>
                  </div>

                  <div className="bg-teal-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-teal-600 uppercase tracking-wide mb-1">
                      Event Passes
                    </label>
                    <p className="text-lg font-semibold text-gray-800">
                      {loadingEvents ? "Loading..." : eventPasses.length}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="lg:col-span-3 space-y-8">
            {/* My Library Books Section - ADDED */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200"
            >
              <StudentLibrary />
            </motion.div>

            {/* Event Passes Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  My Event Passes
                </h2>
                <button
                  onClick={fetchEventPasses}
                  disabled={loadingEvents}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {loadingEvents ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {loadingEvents ? (
                <div className="text-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">
                    Loading your event passes...
                  </p>
                </div>
              ) : eventPasses.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    No Event Passes Yet
                  </h3>
                  <p className="text-gray-500">
                    You haven't been assigned any event passes yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {eventPasses.map((pass) => (
                    <div
                      key={pass.passId}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">
                            {pass.event.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {pass.event.organizer}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            pass.isUsed
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {pass.isUsed ? "Used" : "Active"}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {new Date(pass.event.date).toLocaleDateString()} at{" "}
                          {pass.event.time}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {pass.event.venue}
                        </div>
                      </div>

                      <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                        {pass.event.description}
                      </p>

                      <button
                        onClick={() => showEventQRCode(pass)}
                        disabled={pass.isUsed}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          pass.isUsed
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {pass.isUsed ? "Pass Used" : "Show QR Code"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Assignment Submission & Verification */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Assignment Submission & Verification
              </h2>

              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700">
                    Upload Your File
                  </h3>
                </div>
                <div className="flex items-center justify-center w-full mb-4">
                  <label className="flex flex-col w-full h-32 border-2 border-gray-300 border-dashed hover:bg-gray-100 hover:border-gray-400 transition-all rounded-lg cursor-pointer">
                    <div className="flex flex-col items-center justify-center pt-7">
                      <svg
                        className="w-8 h-8 text-gray-500"
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
                      <p className="pt-1 text-sm text-center text-gray-600 px-2 truncate">
                        {file ? file.name : "Click to browse or drag & drop"}
                      </p>
                    </div>
                    <input
                      type="file"
                      onChange={(e) =>
                        e.target.files[0] && setFile(e.target.files[0])
                      }
                      className="opacity-0"
                    />
                  </label>
                </div>
                <button
                  onClick={handleUpload}
                  className={`w-full py-3 text-white font-semibold rounded-lg flex justify-center items-center gap-2 transition-all duration-300 ${
                    loading || !file
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl"
                  }`}
                  disabled={loading || !file}
                >
                  {loading ? "Uploading..." : "Upload Assignment"}
                </button>
              </div>

              <hr className="my-8 border-gray-200" />

              <div
                className={`transition-all duration-500 ${
                  isReadyForComparison ? "opacity-100" : "opacity-50"
                }`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold text-lg transition-colors duration-500 ${
                      isReadyForComparison ? "bg-green-600" : "bg-gray-400"
                    }`}
                  >
                    2
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700">
                    Verify Handwriting
                  </h3>
                </div>
                <p className="text-gray-600 text-sm mb-4 ml-12">
                  After uploading an assignment, you can verify your handwriting
                  against the sample you provided.
                </p>
                <div className="ml-12">
                  {studentId && (
                    <CompareHandwriting
                      studentId={studentId}
                      isReadyForComparison={isReadyForComparison}
                      onComparisonFailed={onComparisonFailed}
                    />
                  )}
                </div>
              </div>
            </motion.div>

            {/* Assignments History Table */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-gray-800">
                  Submission History
                </h3>
                <button
                  onClick={fetchAssignments}
                  className="text-sm font-medium text-blue-600 hover:underline"
                  disabled={isFetching}
                >
                  {isFetching ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              {isFetching ? (
                <div className="text-center p-8 text-gray-500">
                  Loading assignments...
                </div>
              ) : assignments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Assignment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Submitted
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Marks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignments.map((assignment) => (
                        <tr key={assignment._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {assignment.fileName}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(
                              assignment.uploadDate
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            {assignment.marks ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Graded
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-700">
                            {assignment.marks || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-700">
                    No assignments submitted yet
                  </h4>
                  <p className="mt-1 text-gray-500">
                    Upload your first assignment to see it here.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {showQRModal && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-0"
          >
            <div
              className="absolute inset-0  bg-opacity-30 backdrop-blur-sm min-h-screen"
              onClick={closeQRModal}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-auto"
            >
              <button
                onClick={closeQRModal}
                className="absolute -top-2 -right-2 z-10 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <div className="p-4">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    Event Pass
                  </h3>
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 w-16 mx-auto rounded-full"></div>
                </div>
                <div className="text-center mb-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-1">
                    {selectedEvent.event.title}
                  </h4>
                  <p className="text-xs text-gray-600 mb-1">
                    {new Date(
                      selectedEvent.event.date
                    ).toLocaleDateString()} at {selectedEvent.event.time}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedEvent.event.venue}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border-2 border-gray-100 mb-4">
                  <QRCodeSVG
                    value={selectedEvent.qrCode}
                    size={200}
                    level="H"
                    includeMargin={true}
                    className="mx-auto"
                  />
                </div>
                <div className="flex justify-center mb-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedEvent.isUsed
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : "bg-green-100 text-green-800 border border-green-200"
                    }`}
                  >
                    {selectedEvent.isUsed ? "Pass Used" : "Active Pass"}
                  </span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-blue-700 text-center">
                    <strong>How to use:</strong> Show QR code at event entrance
                  </p>
                </div>
                {selectedEvent.isUsed && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <p className="text-xs font-medium text-red-700 text-center">
                      Used on {new Date(selectedEvent.usedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          theme="colored"
        />
      </div>
    </div>
  );
};

export default UploadFile;