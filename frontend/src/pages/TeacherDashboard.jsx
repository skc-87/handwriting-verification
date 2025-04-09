// import React, { useEffect, useState } from "react";
// import axios from "axios";

// const TeacherDashboard = () => {
//   const [assignments, setAssignments] = useState([]);
//   const [Sample, setSample] = useState([]);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const token = sessionStorage.getItem("token");

//         // Fetch Assignments
//         const assignmentsRes = await axios.get("http://localhost:5000/api/files/upload/assignments", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setAssignments(assignmentsRes.data);

//         // Fetch Submissions
//         const submissionsRes = await axios.get("http://localhost:5000/api/files/upload/", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setSubmissions(submissionsRes.data);
//       } catch (error) {
//         console.error("Error fetching data:", error);
//       }
//     };

//     fetchData();
//   }, []);

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
//         <h2 className="text-3xl font-bold text-blue-600 text-center mb-6">Teacher Dashboard</h2>

//         {/* Assignment List */}
//         <div className="mb-6">
//           <h3 className="text-2xl font-semibold text-gray-700 mb-3">📌 Assignments</h3>
//           {assignments.length > 0 ? (
//             <ul className="bg-blue-50 p-4 rounded-lg shadow-md">
//               {assignments.map((assignment) => (
//                 <li key={assignment._id} className="p-2 border-b last:border-none">
//                   📄 <span className="font-medium">{assignment.title}</span>
//                 </li>
//               ))}
//             </ul>
//           ) : (
//             <p className="text-gray-500 italic">No assignments found.</p>
//           )}
//         </div>

//         {/* Student Submissions */}
//         <div>
//           <h3 className="text-2xl font-semibold text-gray-700 mb-3">📥 Student Sample</h3>
//           {Sample.length > 0 ? (
//             <ul className="bg-green-50 p-4 rounded-lg shadow-md">
//               {Sample.map((submission) => (
//                 <li key={submission._id} className="p-2 border-b last:border-none">
//                   ✅ <span className="font-medium">{submission.studentName}</span> - {submission.assignmentTitle}
//                 </li>
//               ))}
//             </ul>
//           ) : (
//             <p className="text-gray-500 italic">No Sample found.</p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TeacherDashboard;




import React, { useState } from "react";
import axios from "axios";

const TeacherDashboard = () => {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = sessionStorage.getItem("authToken");
       console.log("Token being sent:", token); // Debugging log

      // Fetch Assignments
      const assignmentsRes = await axios.get(
        "http://localhost:5000/api/files/assignments",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAssignments(assignmentsRes.data);

      // Fetch Submissions
      const submissionsRes = await axios.get(
        "http://localhost:5000/api/files/handwriting_samples",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmissions(submissionsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-3xl font-bold text-blue-600 text-center mb-6">
          Teacher Dashboard
        </h2>

        <div className="flex justify-center mb-8">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className={`px-6 py-3 rounded-lg font-medium text-white ${
              isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            } transition-colors`}
          >
            {isLoading ? "Fetching Data..." : "Fetch Data"}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Assignment Table */}
        <div className="mb-8">
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">
            📌 Assignments
          </h3>
          {assignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="py-3 px-4 border-b text-left">Title</th>
                    <th className="py-3 px-4 border-b text-left">Description</th>
                    <th className="py-3 px-4 border-b text-left">Due Date</th>
                    <th className="py-3 px-4 border-b text-left">File</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 border-b">{assignment.title}</td>
                      <td className="py-3 px-4 border-b">
                        {assignment.description || "N/A"}
                      </td>
                      <td className="py-3 px-4 border-b">
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 border-b">
                        <a
                          href={`http://localhost:5000/${assignment.filePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">
              {isLoading ? "Loading assignments..." : "No assignments found."}
            </p>
          )}
        </div>

        {/* Student Submissions Table */}
        <div>
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">
            📥 Student Submissions
          </h3>
          {submissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-green-50">
                  <tr>
                    <th className="py-3 px-4 border-b text-left">Student</th>
                    <th className="py-3 px-4 border-b text-left">Assignment</th>
                    <th className="py-3 px-4 border-b text-left">Submitted At</th>
                    <th className="py-3 px-4 border-b text-left">File</th>
                    <th className="py-3 px-4 border-b text-left">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 border-b">
                        {submission.studentName || "Anonymous"}
                      </td>
                      <td className="py-3 px-4 border-b">
                        {submission.assignmentTitle}
                      </td>
                      <td className="py-3 px-4 border-b">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 border-b">
                        <a
                          href={`http://localhost:5000/${submission.filePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Download
                        </a>
                      </td>
                      <td className="py-3 px-4 border-b">
                        {submission.grade || "Not graded"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">
              {isLoading ? "Loading submissions..." : "No submissions found."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;