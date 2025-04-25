import DataTable from "./DataTable";
import EvaluationButton from "./EvaluationButton";

const AssignmentsTable = ({ data, isLoading, API_BASE_URL, searchTerm, handleEvaluate }) => {
  const filteredData = data.filter((assignment) =>
    assignment.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: "studentName", header: "Student Name" },
    { key: "fileName", header: "Title" },
    { key: "description", header: "Description" },
    { 
      key: "uploadDate", 
      header: "Upload Date",
      render: (item) => new Date(item.uploadDate).toLocaleString()
    },
    {
      key: "actions",
      header: "File",
      render: (item) => (
        <a
          href={`${API_BASE_URL}/view-assignment/${item.studentId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
          aria-label={`Download assignment for ${item.studentName}`}
        >
          view
        </a>
      )
    },
    {
      key: "evaluation",
      header: "Evaluation",
      render: (item) => (
        <EvaluationButton 
          assignment={item} 
          onEvaluate={handleEvaluate} 
          isEvaluated={item.marks !== null && item.marks !== undefined}
        />
      )
    }
  ];

  return (
    <div className="my-8">
      <div className="max-w-5xl mx-auto mt-6 flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-700">
          📌 Assignments
        </h2>
      </div>
      <DataTable
        title="assignments"
        data={filteredData}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No assignments found."
      />
    </div>
  );
};

export default AssignmentsTable;