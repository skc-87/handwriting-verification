// CompareHandwriting.jsx
import { useState } from "react";
import axios from "axios";

const CompareHandwriting = ({ studentId }) => {
  const [comparisonResult, setComparisonResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    const token = sessionStorage.getItem("authToken");
    if (!token) {
      setError("User not authenticated. Please log in.");
      return;
    }

    setLoading(true);
    setComparisonResult(null);
    setError(null);

    try {
      const response = await axios.get(
        `http://localhost:5000/api/model/compare-handwriting/${studentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("[✅ Compare] Response received:", response.data);

      if (response.data.status === "success") {
        setComparisonResult(response.data);
      } else {
        setError(response.data.message || "Comparison failed.");
      }
    } catch (err) {
      console.error("[❌ Compare] Error:", err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || "Comparison failed.");
      } else {
        setError("Server error while comparing handwriting.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Handwriting Comparison</h3>

      <button
        onClick={handleCompare}
        className="w-full py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition duration-300"
        disabled={loading}
      >
        {loading ? "Comparing..." : "Compare Handwriting"}
      </button>

      {comparisonResult && (
        <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-md">
          <p className="text-sm font-medium">✅ Comparison Result:</p>
          <div className="text-sm mt-2">
            <p>
              <strong>Similarity Score:</strong>{" "}
              {comparisonResult.similarity?.toFixed(2)}%
            </p>
            <p>
              <strong>Handwriting Match:</strong>{" "}
              {comparisonResult.matched ? "✅ Yes" : "❌ No"}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-md">
          <p className="text-sm font-medium">❌ Error:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default CompareHandwriting;
