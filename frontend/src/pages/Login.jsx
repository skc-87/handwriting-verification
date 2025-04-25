import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Toast configuration
  const toastConfig = {
    position: "top-right",
    autoClose: 2000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter both email and password", toastConfig);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      console.log("Full Response:", response.data);

      const { token, role, name, ...user } = response.data;

      if (!token) {
        console.error("Token not received from backend!");
        toast.error("Authentication failed. Please try again.", toastConfig);
        return;
      }

      // Store in sessionStorage
      sessionStorage.setItem("authToken", token);
      sessionStorage.setItem("role", role);
      sessionStorage.setItem("user", JSON.stringify(user)); // user = { _id, name, email }
      sessionStorage.setItem("userName", name);

      console.log("Stored Token:", sessionStorage.getItem("authToken"));
      toast.success("Login successful!", toastConfig);

      // Redirect based on role after a short delay to allow toast to be seen
      setTimeout(() => {
        if (role === "teacher") {
          navigate("/teacher-dashboard");
        } else {
          navigate("/upload");
        }
      }, 1000);

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed";
      setError(errorMessage);
      toast.error(errorMessage, toastConfig);
      console.error("Login error:", error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  // Handler for Enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };
  

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-2 border rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-2 border rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleLogin}
          className={`w-full py-2 text-white font-semibold rounded-md ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          } transition duration-300`}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-sm mt-4">
          New here?{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;