// CompareHandwriting.jsx
import { useState } from "react";
import axios from "axios";

const CompareHandwriting = ({ studentId }) => {
  const [comparisonResult, setComparisonResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [randomFact, setRandomFact] = useState(null);


  const funFacts = [
    "Handwriting can reveal over 5,000 personality traits!",
    "No two people write the same – even identical twins.",
    "Leonardo da Vinci wrote in mirror writing.",
    "The word 'graphology' comes from Greek: 'graph' = write, 'ology' = study.",
    "Your brain makes over 1000 decisions per second when you write!",
    "Writing by hand activates more regions of the brain than typing.",
    "Cursive writing improves fine motor skills and brain development.",
    "Some schools in the world still teach calligraphy as a subject.",
    "In the digital age, handwritten notes are shown to improve memory retention.",
    "The loops and slants in your handwriting may reflect your mood and confidence.",
    "Graphologists claim that large handwriting means you're outgoing and social.",
    "A quick change in someone's handwriting can be a sign of emotional distress.",
    "Handwriting can be used as a biometric — just like fingerprints!",
    "Left-handed people often have a distinctive slant in their handwriting.",
    "The average ballpoint pen can write about 45,000 words before it runs out."
  ];
  

  const handleCompare = async () => {
    const token = sessionStorage.getItem("authToken");
    if (!token) {
      setError("User not authenticated. Please log in.");
      return;
    }

    setLoading(true);
    setComparisonResult(null);
    setError(null);
    setRandomFact(funFacts[Math.floor(Math.random() * funFacts.length)]);


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
      <h3 className="text-lg font-semibold mb-2 text-center">Handwriting Comparison</h3>
  
      <button
        onClick={handleCompare}
        className="w-full py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition duration-300 flex justify-center items-center gap-2"
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
            Comparing...
          </>
        ) : (
          "Compare Handwriting"
        )}
      </button>
  
      {loading && randomFact && (
        <p className="text-sm text-gray-500 mt-2 text-center italic transition-opacity duration-300 ease-in-out">
          🧠 Did you know? {randomFact}
        </p>
      )}
  
      {comparisonResult && (
        <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-md">
          <p className="text-sm font-medium">✅ Comparison Result:</p>
          <div className="text-sm mt-2">
            <p>
              <strong>Similarity Score:</strong>{" "}
              {comparisonResult.siamese_similarity?.toFixed(2)}%
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
}
export default CompareHandwriting;
