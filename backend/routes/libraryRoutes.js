const express = require('express');
const {
  addBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  issueBook,
  returnBook,
  getTransactions,
  getLibraryStats,
  getStudents,
  getStudentBooks // Add this import
} = require('../controllers/libraryController');
const {authMiddleware} = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Book management routes
router.post('/books', addBook);
router.get('/books', getAllBooks);
router.get('/books/:id', getBookById);
router.put('/books/:id', updateBook);
router.delete('/books/:id', deleteBook);

// Book transaction routes
router.post('/issue', issueBook);
router.post('/return', returnBook);
router.get('/transactions', getTransactions);

// Student routes
router.get('/students', getStudents); // Use the controller

// Statistics route
router.get('/stats', getLibraryStats);

router.get('/student/my-books', getStudentBooks);

module.exports = router;