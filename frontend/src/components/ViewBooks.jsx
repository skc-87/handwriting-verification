import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Pagination,
  Alert
} from '@mui/material';
import axios from 'axios';

const ViewBooks = ({ onStatsUpdate }) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });
  const [error, setError] = useState('');

  const API_BASE_URL = 'http://localhost:5000';

  const fetchBooks = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem("authToken");
      
      if (!token) {
        setError('Please login again');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/library/books`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { page, limit: 12, search, category }
      });
      
      const booksData = response.data?.books || [];
      setBooks(booksData);
      setPagination({
        page: response.data?.currentPage || 1,
        totalPages: response.data?.totalPages || 1,
        total: response.data?.total || 0
      });

      const uniqueCategories = [...new Set(booksData.map(book => book.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching books:', error);
      if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError('Failed to fetch books. Please try again.');
      }
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks(1);
  }, [search, category]);

  const handlePageChange = (event, value) => {
    fetchBooks(value);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Search Books"
          variant="outlined"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, author, or ISBN"
          sx={{ minWidth: 250 }}
        />
        <TextField
          select
          label="Filter by Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All Categories</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={200}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {books.map((book) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={book._id}>
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
                      Publisher: {book.publisher}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Year: {book.publication_year}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography 
                        variant="body2" 
                        color={book.available_copies > 0 ? 'success.main' : 'error.main'}
                      >
                        Available: {book.available_copies}/{book.total_copies}
                      </Typography>
                      {book.location && (
                        <Typography variant="body2" color="textSecondary">
                          Shelf: {book.location}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}

          {books.length === 0 && !loading && !error && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                No books found
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ViewBooks;