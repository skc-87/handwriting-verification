import DataTable from "./DataTable";

const HandwritingSamplesTable = ({ data, isLoading, API_BASE_URL, searchTerm }) => {
  const filteredData = data.filter((sample) =>
    sample.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: "studentId", header: "Student ID" },
    { key: "studentName", header: "Student Name" },
    { 
      key: "uploadDate", 
      header: "Uploaded At",
      render: (item) => new Date(item.uploadDate).toLocaleString()
    },
    {
      key: "actions",
      header: "File",
      render: (item) => (
        <a
          href={`${API_BASE_URL}/view-sample/${item.studentId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
          aria-label={`View handwriting sample for ${item.studentName}`}
        >
          View
        </a>
      )
    }
  ];

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">
        📥 Handwriting Samples
      </h2>
      <DataTable
        title="handwriting samples"
        data={filteredData}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No handwriting samples found."
      />
    </div>
  );
};

export default HandwritingSamplesTable;