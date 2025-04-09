import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold mb-6">Welcome to Student-Teacher Portal</h1>
      <div className="flex gap-4">
        <Link
          to="/login"
          className="px-6 py-3 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-700 transition"
        >
          Login
        </Link>
        <Link
          to="/signup"
          className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-700 transition"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
};

export default Home;
