import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UploadFile from "./pages/UploadFile";
import ProtectedRoute from "./ProtectedRoute";
import TeacherDashboard from "./pages/TeacherDashboard";
import LibrarianDashboard from './pages/LibrarianDashboard';

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={2000} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/teacher-dashboard"
          element={
            <ProtectedRoute>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/librarian-dashboard"
          element={
            <ProtectedRoute>
              <LibrarianDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadFile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;