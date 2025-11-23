import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import axios from 'axios';

const ManageBooks = ({ onStatsUpdate }) => {
  const [books, setBooks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [categories, setCategories] = useState(['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Biography', 'Mathematics', 'Physics', 'Chemistry', 'Computer Science']);
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = 'http://localhost:5000';

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    publisher: '',
    publication_year: new Date().getFullYear(),
    total_copies: 1,
    location: '',
    description: ''
  });

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("authToken");
      const response = await axios.get(`${API_BASE_URL}/api/library/books`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 }
      });
      setBooks(response.data?.books || []);
    } catch (error) {
      showSnackbar('Error fetching books', 'error');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category: '',
      publisher: '',
      publication_year: new Date().getFullYear(),
      total_copies: 1,
      available_copies: 1,
      location: '',
      description: ''
    });
    setEditingBook(null);
  };

  const handleOpenDialog = (book = null) => {
    if (book) {
      setFormData(book);
      setEditingBook(book);
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'publication_year' || name === 'total_copies' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("authToken");
      
      if (editingBook) {
        await axios.put(`${API_BASE_URL}/api/library/books/${editingBook._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Book updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/api/library/books`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Book added successfully');
      }

      handleCloseDialog();
      fetchBooks();
      onStatsUpdate?.();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Error saving book', 'error');
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;

    try {
      const token = sessionStorage.getItem("authToken");
      await axios.delete(`${API_BASE_URL}/api/library/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Book deleted successfully');
      fetchBooks();
      onStatsUpdate?.();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Error deleting book', 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Manage Books</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add New Book
        </Button>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" height={200}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={3}>
        {books && books.map((book) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={book._id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom noWrap>
                  {book.title}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  by {book.author}
                </Typography>
                <Chip 
                  label={book.category} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  ISBN: {book.isbn}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Publisher: {book.publisher} ({book.publication_year})
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Copies: {book.available_copies}/{book.total_copies} available
                </Typography>
                {book.location && (
                  <Typography variant="body2" color="textSecondary">
                    Location: {book.location}
                  </Typography>
                )}
                {book.description && (
                  <Typography variant="body2" sx={{ mt: 1 }} noWrap>
                    {book.description}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <IconButton 
                  color="primary" 
                  onClick={() => handleOpenDialog(book)}
                  size="small"
                >
                  <Edit />
                </IconButton>
                <IconButton 
                  color="error" 
                  onClick={() => handleDeleteBook(book._id)}
                  size="small"
                >
                  <Delete />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {!loading && books && books.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            No books found. Add your first book!
          </Typography>
        </Box>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingBook ? 'Edit Book' : 'Add New Book'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="title"
                  label="Book Title"
                  value={formData.title}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="author"
                  label="Author"
                  value={formData.author}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="isbn"
                  label="ISBN"
                  value={formData.isbn}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  name="category"
                  label="Category"
                  value={formData.category}
                  onChange={handleInputChange}
                  fullWidth
                  required
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="publisher"
                  label="Publisher"
                  value={formData.publisher}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="publication_year"
                  label="Publication Year"
                  type="number"
                  value={formData.publication_year}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  inputProps={{ min: 1900, max: new Date().getFullYear() }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="total_copies"
                  label="Total Copies"
                  type="number"
                  value={formData.total_copies}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="location"
                  label="Shelf Location"
                  value={formData.location}
                  onChange={handleInputChange}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  name="description"
                  label="Description"
                  value={formData.description}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingBook ? 'Update Book' : 'Add Book'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManageBooks;