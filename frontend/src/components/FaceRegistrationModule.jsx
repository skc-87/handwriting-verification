import { useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { toast } from "react-toastify";

const FaceRegistrationModule = ({ token, apiUrl }) => {
  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    studentId: "",
    studentName: "",
    image: "",
    imageFile: null,
  });

  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const captureImage = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error("Unable to capture image");
      return;
    }

    const blob = dataURLtoBlob(imageSrc);
    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

    setFormData({ 
      ...formData, 
      image: imageSrc,
      imageFile: file
    });
    toast.success("Image captured successfully");
  };

  const dataURLtoBlob = (dataURL) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({
        ...formData,
        image: event.target.result,
        imageFile: file
      });
      toast.success("Image selected successfully");
    };
    reader.readAsDataURL(file);
  };

  const handleRegister = async () => {
    if (!formData.studentId || !formData.studentName || !formData.imageFile) {
      toast.error("Please provide all fields and capture/upload a face image.");
      return;
    }

    try {
      setIsLoading(true);
      
      // Prepare the payload according to backend expectations
      const payload = {
        student_id: formData.studentId,
        name: formData.studentName,
        image: formData.image // Already in base64 format
      };

      const response = await axios.post(
        `${apiUrl}/register-face`,
        payload,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data.success) {
        setRegistrationStatus({
          studentId: formData.studentId,
          name: formData.studentName,
          status: "Registered",
        });
        toast.success(response.data.message || "Student registered successfully!");
        setFormData({ studentId: "", studentName: "", image: "", imageFile: null });
        setShowCamera(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error(response.data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(
        error.response?.data?.message || 
        error.response?.data?.error || 
        "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }; 

  return (
    <div className="mb-8 p-6 border rounded-lg bg-white shadow-sm">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Student Face Registration</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student ID *
            </label>
            <input
              type="text"
              value={formData.studentId}
              onChange={(e) =>
                setFormData({ ...formData, studentId: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter student ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.studentName}
              onChange={(e) =>
                setFormData({ ...formData, studentName: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter student's full name"
              required
            />
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Face Image *
            </label>
            <div className="flex flex-col space-y-3">
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                disabled={!formData.studentId || !formData.studentName}
                className={`px-4 py-2 rounded-md ${
                  !formData.studentId || !formData.studentName
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                Use Camera
              </button>

              <div className="relative">
                <span className="block text-center text-sm text-gray-500 my-1">
                  OR
                </span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-center cursor-pointer border border-gray-300"
              >
                Upload Image
              </label>
            </div>
          </div>
        </div>

        {/* Image preview/capture area */}
        <div className="flex flex-col items-center">
          {showCamera ? (
            <div className="w-full max-w-md space-y-3">
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
          ) : formData.image ? (
            <div className="w-full max-w-md space-y-3">
              <div className="border border-gray-300 rounded-md p-1">
                <img
                  src={formData.image}
                  alt="Captured"
                  className="w-full rounded-md"
                />
              </div>
              <button
                onClick={() => setFormData({ ...formData, image: "", imageFile: null })}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Remove Image
              </button>
            </div>
          ) : (
            <div className="w-full max-w-md h-64 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
              No image selected
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleRegister}
          disabled={
            isLoading ||
            !formData.studentId ||
            !formData.studentName ||
            !formData.imageFile
          }
          className={`px-6 py-2 rounded-md ${
            isLoading ||
            !formData.studentId ||
            !formData.studentName ||
            !formData.imageFile
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
              Registering...
            </span>
          ) : (
            "Register Student"
          )}
        </button>
      </div>

      {registrationStatus && (
        <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-100">
          <h3 className="text-lg font-medium text-blue-800 mb-2">
            Registration Successful
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <p>
              <span className="text-gray-600">Student ID:</span>{" "}
              <span className="font-medium">{registrationStatus.studentId}</span>
            </p>
            <p>
              <span className="text-gray-600">Name:</span>{" "}
              <span className="font-medium">{registrationStatus.name}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceRegistrationModule;