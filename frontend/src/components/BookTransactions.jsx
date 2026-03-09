import React, { useState, useEffect } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, TextField, MenuItem, Typography, Pagination, CircularProgress, Alert, Tooltip, IconButton } from '@mui/material';
import { Refresh, Person, Book } from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../config';
const BookTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [studentDetails, setStudentDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    page: 1
  });
  const [pagination, setPagination] = useState({
    totalPages: 1,
    total: 0
  });
  const [error, setError] = useState('');
  const fetchStudentDetails = async (studentId) => {
    try {
      const token = sessionStorage.getItem("authToken");
      const response = await axios.get(`${API_BASE_URL}/api/library/students/${studentId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      return null;
    }
  };
  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem("authToken");
      if (!token) { setError('Please login again'); return; }

      const response = await axios.get(`${API_BASE_URL}/api/library/transactions`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { ...filters, page, limit: 10 }
      });
      const transactionsData = response.data?.transactions || [];
      setTransactions(transactionsData);
      setPagination({
        totalPages: response.data?.totalPages || 1,
        total: response.data?.total || 0
      });

      const studentDetailsMap = {};
      const fetchPromises = [];
      for (const transaction of transactionsData) {
        if (transaction.student && typeof transaction.student === 'string') {
          const studentId = transaction.student;
          fetchPromises.push(
            fetchStudentDetails(studentId).then(studentData => {
              if (studentData) studentDetailsMap[studentId] = studentData;
            })
          );
        } else if (transaction.student && transaction.student._id) {
          studentDetailsMap[transaction.student._id] = transaction.student;
        }
      }
      await Promise.all(fetchPromises);
      setStudentDetails(studentDetailsMap);
    } catch (error) {
      if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError('Failed to fetch transactions');
      }
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchTransactions(1); }, [filters.status]);
  const handleRefresh = () => { fetchTransactions(filters.page); };
  const handlePageChange = (event, value) => {
    setFilters(prev => ({ ...prev, page: value }));
    fetchTransactions(value);
  };
  const getStatusColor = (status) => {
    switch (status) {
      case 'issued': return 'warning';
      case 'returned': return 'success';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
  const isOverdue = (dueDate, status) => status === 'issued' && new Date(dueDate) < new Date();
  const getStudentInfo = (transaction) => {
    let student = transaction.student;
    if (typeof student === 'string' && studentDetails[student]) student = studentDetails[student];

    if (!student) {
      return { 
        name: 'Unknown Student', 
        department: 'Data Missing', 
        year: 'N/A',
        id: typeof transaction.student === 'string' ? transaction.student : 'unknown'
      };
    }

    const name = student.user?.name || student.name || 'Unknown Student';
    const department = student.department || 'Not Specified';
    const year = student.year || student.academic_year || 'N/A';
    const id = student._id || (typeof transaction.student === 'string' ? transaction.student : 'unknown');

    return { name, department, year, id };
  };
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 0 }}>
          📚 Book Transactions History
        </Typography>
        <Tooltip title="Refresh transactions">
          <IconButton onClick={handleRefresh} color="primary" disabled={loading}
            sx={{ backgroundColor: 'primary.light', '&:hover': { backgroundColor: 'primary.main', color: 'white' } }}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          select
          label="Filter by Status"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          sx={{ minWidth: 150 }}
          size="small"
        >
          <MenuItem value="">All Status</MenuItem>
          <MenuItem value="issued">Issued</MenuItem>
          <MenuItem value="returned">Returned</MenuItem>
          <MenuItem value="overdue">Overdue</MenuItem>
        </TextField>
        <Chip icon={<Person />} label={`${transactions.length} transactions`} variant="outlined" color="primary" />
      </Box>
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Table>
          <TableHead sx={{ backgroundColor: 'grey.50' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Person /> Student Information</Box></TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Book /> Book Details</Box></TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Issue Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Due Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Return Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Fine (₹)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Loading transactions and student details...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    📭 No transactions found
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {filters.status ? `No ${filters.status} transactions` : 'No transactions in the system yet'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => {
                const studentInfo = getStudentInfo(transaction);
                const isStudentDataComplete = studentInfo.name !== 'Unknown Student' && studentInfo.year !== 'N/A';
                
                return (
                  <TableRow key={transaction._id}
                    sx={{ '&:hover': { backgroundColor: 'action.hover', transition: 'background-color 0.2s ease' }, backgroundColor: !isStudentDataComplete ? 'warning.light' : 'inherit' }}>
                    <TableCell>
                      <Tooltip title={!isStudentDataComplete ? "Student data needs population" : `ID: ${studentInfo.id}`} arrow>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold" color={isStudentDataComplete ? "primary" : "warning.dark"}>
                            {studentInfo.name}{!isStudentDataComplete && " ⚠️"}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block">🎓 {studentInfo.department}</Typography>
                          <Typography variant="caption" color="textSecondary">📅 Year {studentInfo.year}</Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">{transaction.book?.title || 'Unknown Book'}</Typography>
                      <Typography variant="caption" color="textSecondary" display="block">✍️ by {transaction.book?.author || 'Unknown Author'}</Typography>
                      <Typography variant="caption" color="textSecondary">🔢 ISBN: {transaction.book?.isbn || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={formatDate(transaction.issue_date)} size="small" variant="outlined" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={formatDate(transaction.due_date)} size="small" variant="outlined" color={isOverdue(transaction.due_date, transaction.status) ? "error" : "default"} />
                        {isOverdue(transaction.due_date, transaction.status) && (
                          <Chip label="Overdue" color="error" size="small" variant="filled" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {transaction.return_date ? (
                        <Chip label={formatDate(transaction.return_date)} size="small" variant="outlined" color="success" />
                      ) : (
                        <Typography variant="body2" color="textSecondary" fontStyle="italic">Not returned</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" color={transaction.fine_amount > 0 ? "error" : "textSecondary"} fontWeight={transaction.fine_amount > 0 ? "bold" : "normal"}
                        sx={{ backgroundColor: transaction.fine_amount > 0 ? 'error.light' : 'transparent', px: 1, py: 0.5, borderRadius: 1, display: 'inline-block' }}>
                        ₹{transaction.fine_amount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={transaction.status.toUpperCase()} color={getStatusColor(transaction.status)} size="small" sx={{ fontWeight: 'bold' }} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pagination.totalPages}
            page={filters.page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
      <Box sx={{ mt: 3 }}>
        <Alert severity="info" sx={{ borderRadius: 2, backgroundColor: 'info.light', color: 'info.dark' }}>
          <Typography variant="subtitle2" fontWeight="bold">📊 Library Statistics</Typography>
          Total Transactions: <strong>{pagination.total}</strong> • 
          Currently Showing: <strong>{transactions.length}</strong> records
          {Object.keys(studentDetails).length > 0 && (
            <> • Student Details Loaded: <strong>{Object.keys(studentDetails).length}</strong></>
          )}
        </Alert>
      </Box>
    </Box>
  );
};
export default BookTransactions;