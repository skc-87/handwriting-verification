import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, TextField, Button, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Alert, Snackbar, CircularProgress } from '@mui/material';
import axios from 'axios';
import { API_BASE_URL } from '../config';
const IssueReturnBooks = ({ onStatsUpdate }) => {
  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [issueForm, setIssueForm] = useState({ studentId: '', bookId: '', dueDays: 15 });
  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const token = sessionStorage.getItem("authToken");
      if (!token) { showSnackbar('Please login again', 'error'); return; }

      const response = await axios.get(`${API_BASE_URL}/api/library/students`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const studentsList = response.data?.students || [];
      setStudents(Array.isArray(studentsList) ? studentsList : []);
    } catch (error) {
      if (error.response?.status === 401) {
        showSnackbar('Session expired. Please login again.', 'error');
      } else {
        showSnackbar('Failed to load students. Please try again.', 'error');
      }
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };
  const fetchAvailableBooks = async () => {
    try {
      const token = sessionStorage.getItem("authToken");
      const response = await axios.get(`${API_BASE_URL}/api/library/books`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 }
      });
      const availableBooks = (response.data?.books || []).filter(book => book.available_copies > 0);
      setBooks(availableBooks);
    } catch (error) {
      setBooks([]);
    }
  };
  const fetchIssuedBooks = async () => {
    try {
      const token = sessionStorage.getItem("authToken");
      const response = await axios.get(`${API_BASE_URL}/api/library/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'issued', limit: 50 }
      });
      setIssuedBooks(response.data?.transactions || []);
    } catch (error) {
      setIssuedBooks([]);
    }
  };
  useEffect(() => { fetchStudents(); fetchAvailableBooks(); fetchIssuedBooks(); }, []);
  const showSnackbar = (message, severity = 'success') => { setSnackbar({ open: true, message, severity }); };
  const handleCloseSnackbar = () => { setSnackbar({ ...snackbar, open: false }); };
  const handleIssueBook = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = sessionStorage.getItem("authToken");
      await axios.post(`${API_BASE_URL}/api/library/issue`, issueForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSnackbar('Book issued successfully');
      setIssueForm({ studentId: '', bookId: '', dueDays: 15 });
      fetchAvailableBooks();
      fetchIssuedBooks();
      onStatsUpdate?.();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Error issuing book', 'error');
    } finally {
      setLoading(false);
    }
  };
  const handleReturnBook = async (transactionId) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("authToken");
      const response = await axios.post(`${API_BASE_URL}/api/library/return`, 
        { transactionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const fineMsg = response.data.fineAmount > 0 ? ` with fine: ₹${response.data.fineAmount}` : '';
      showSnackbar(`Book returned successfully${fineMsg}`);
      fetchAvailableBooks();
      fetchIssuedBooks();
      onStatsUpdate?.();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Error returning book', 'error');
    } finally {
      setLoading(false);
    }
  };
  const getSelectedStudent = () => students.find(s => s._id === issueForm.studentId);
  const getSelectedBook = () => books.find(b => b._id === issueForm.bookId);
  const isStudentAtLimit = () => { const student = getSelectedStudent(); return student && student.currently_borrowed_books >= student.max_books_allowed; };
  const isOverdue = (dueDate) => new Date(dueDate) < new Date();
  const calculateFine = (dueDate) => {
    if (!isOverdue(dueDate)) return 0;
    const overdueDays = Math.ceil((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
    return overdueDays * 5;
  };
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Issue Book to Student
              </Typography>
              <form onSubmit={handleIssueBook}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField select label="Select Student" value={issueForm.studentId} onChange={(e) => setIssueForm({...issueForm, studentId: e.target.value})} fullWidth required disabled={studentsLoading}>
                      <MenuItem value="">Select Student</MenuItem>
                      {studentsLoading ? (
                        <MenuItem disabled><CircularProgress size={20} /> Loading students...</MenuItem>
                      ) : (
                        students.map((student) => (
                          <MenuItem key={student._id} value={student._id}>{student.user?.name} - {student.department} (Year {student.year})</MenuItem>
                        ))
                      )}
                    </TextField>
                    {students.length === 0 && !studentsLoading && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        No students found. Please ensure students are registered in the system.
                      </Alert>
                    )}
                    {students.length > 0 && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        Found {students.length} student(s) in the system
                      </Alert>
                    )}
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField select label="Select Book" value={issueForm.bookId} onChange={(e) => setIssueForm({...issueForm, bookId: e.target.value})} fullWidth required>
                      <MenuItem value="">Select Book</MenuItem>
                      {books.map((book) => (
                        <MenuItem key={book._id} value={book._id}>{book.title} by {book.author} (Available: {book.available_copies})</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField label="Due Days" type="number" value={issueForm.dueDays} onChange={(e) => setIssueForm({...issueForm, dueDays: parseInt(e.target.value) || 1})} fullWidth required inputProps={{ min: 1, max: 30 }} />
                  </Grid>
                  {issueForm.studentId && (
                    <Grid size={{ xs: 12 }}>
                      <Alert severity={isStudentAtLimit() ? "error" : "info"} sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          Student: {getSelectedStudent()?.user?.name}<br />
                          Department: {getSelectedStudent()?.department}<br />
                          Year: {getSelectedStudent()?.year}<br />
                          Borrowed: {getSelectedStudent()?.currently_borrowed_books || 0}/{getSelectedStudent()?.max_books_allowed || 3} books
                          {isStudentAtLimit() && " - MAX LIMIT REACHED!"}
                        </Typography>
                      </Alert>
                    </Grid>
                  )}
                  {issueForm.bookId && (
                    <Grid size={{ xs: 12 }}>
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <Typography variant="body2">Book: {getSelectedBook()?.title}<br />Author: {getSelectedBook()?.author}<br />Available: {getSelectedBook()?.available_copies} copies</Typography>
                      </Alert>
                    </Grid>
                  )}
                  <Grid size={{ xs: 12 }}>
                    <Button type="submit" variant="contained" fullWidth disabled={loading || !issueForm.studentId || !issueForm.bookId || isStudentAtLimit() || students.length === 0}>
                      {loading ? <CircularProgress size={24} /> : 'Issue Book'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="secondary">
                Currently Issued Books
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Book</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Fine</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {issuedBooks.map((transaction) => (
                      <TableRow key={transaction._id}>
                        <TableCell>
                          <Typography variant="body2">{transaction.student?.user?.name}</Typography>
                          <Typography variant="caption" color="textSecondary">{transaction.student?.department}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{transaction.book?.title}</Typography>
                          <Typography variant="caption" color="textSecondary">by {transaction.book?.author}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={new Date(transaction.due_date).toLocaleDateString()} color={isOverdue(transaction.due_date) ? "error" : "default"} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography color={calculateFine(transaction.due_date) > 0 ? "error" : "textSecondary"} variant="body2">₹{calculateFine(transaction.due_date)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Button variant="outlined" color="primary" size="small" onClick={() => handleReturnBook(transaction._id)} disabled={loading}>Return</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {issuedBooks.length === 0 && (
                <Typography color="textSecondary" textAlign="center" py={2}>
                  No books currently issued
                </Typography>              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default IssueReturnBooks;