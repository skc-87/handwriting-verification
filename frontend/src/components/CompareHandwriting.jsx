import { useState, useEffect } from "react";
import axios from "axios";

const CompareHandwriting = ({ studentId }) => {
  const [comparisonResult, setComparisonResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [randomFact, setRandomFact] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [progress, setProgress] = useState(0);

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

  useEffect(() => {
    if (loading) {
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return 95;
          return prev + Math.floor(Math.random() * 10) + 5;
        });
      }, 800);
      return () => clearInterval(timer);
    } else {
      setProgress(0);
    }
  }, [loading]);

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
        setProgress(100); // Complete the progress bar
        setTimeout(() => setProgress(0), 1000); // Reset after completion
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
    <div className="mt-8 p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          <span className="inline-flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            Handwriting Analysis
          </span>
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          {showDetails ? "Hide details" : "How it works"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 ml-1 transition-transform ${showDetails ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {showDetails && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="mb-2">
            Our handwriting comparison system uses advanced AI to analyze key characteristics:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Letter shapes and formations</li>
            <li>Spacing between words and letters</li>
            <li>Pen pressure and stroke patterns</li>
            <li>Slant angles and baseline alignment</li>
            <li>Unique flourishes and signatures</li>
          </ul>
        </div>
      )}

      <button
        onClick={handleCompare}
        className={`w-full py-3 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex justify-center items-center gap-2 ${
          loading
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 shadow-md"
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
            Analyzing...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Compare Handwriting
          </>
        )}
      </button>

      {loading && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Analyzing samples...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {loading && randomFact && (
        <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">Did you know?</span> {randomFact}
              </p>
            </div>
          </div>
        </div>
      )}

      {comparisonResult && (
        <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-green-800 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Analysis Results
            </h4>
            <span className="px-2 py-1 text-xs font-semibold bg-green-200 text-green-800 rounded-full">
              {comparisonResult.matched ? "MATCH FOUND" : "NO MATCH"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Similarity Score
                </span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  AI Confidence
                </span>
              </div>
              <div className="flex items-end">
                <span className="text-3xl font-bold text-blue-600">
                  {comparisonResult.siamese_similarity?.toFixed(1)}
                </span>
                <span className="text-lg text-gray-500 ml-1">/100</span>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${comparisonResult.siamese_similarity}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-sm font-medium text-gray-600 mb-2">
                Verdict
              </div>
              <div className="flex items-center">
                {comparisonResult.matched ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-green-500 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-green-700 font-medium">
                      Likely the same author
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-red-500 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-red-700 font-medium">
                      Different authors likely
                    </span>
                  </>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {comparisonResult.matched
                  ? "Our analysis suggests these samples share significant characteristics."
                  : "Key differences were detected between the writing samples."}
              </div>
            </div>
          </div>

          {comparisonResult.details && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Analysis Details
              </h5>
              <ul className="text-xs text-gray-600 space-y-1">
                {Object.entries(comparisonResult.details).map(([key, value]) => (
                  <li key={key} className="flex justify-between">
                    <span className="capitalize">{key.replace(/_/g, " ")}:</span>
                    <span className="font-medium">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleCompare}
                    className="inline-flex items-center text-sm font-medium text-red-700 hover:text-red-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompareHandwriting;