import { toast } from "react-toastify";
import { useState } from "react";


const FileUploadForm = ({ onUpload, isLoading }) => {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [file, setFile] = useState(null);

  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (file && !ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 5MB');
      return;
    }

    onUpload({ studentId, studentName, file });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto mt-10 p-4 border rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">Upload Handwriting Sample</h2>

      <input
        type="text"
        placeholder="Enter Student ID"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className="w-full p-2 mb-1 border rounded"
        aria-label="Student ID"
      />

      <div className="flex items-center my-1">
        <hr className="flex-grow border-gray-300" />
        <span className="px-4 text-gray-500 font-semibold">OR</span>
        <hr className="flex-grow border-gray-300" />
      </div>

      <input
        type="text"
        placeholder="Enter Student Name"
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
        className="w-full p-2 mb-4 border rounded"
        aria-label="Student Name"
      />

      <input
        id="fileInput"
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={(e) => setFile(e.target.files[0])}
        className="w-full p-2 mb-4 border rounded"
        aria-label="File upload"
        required
      />

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isLoading ? "Uploading..." : "Upload Handwriting Sample"}
      </button>
    </form>
  );
};

export default FileUploadForm;