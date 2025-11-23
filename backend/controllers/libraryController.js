const LibraryBook = require('../models/LibraryBook');
const BookTransaction = require('../models/BookTransaction');
const Student = require('../models/Student');
const User = require('../models/User');

const addBook = async (req, res) => {
  try {
    const book = new LibraryBook(req.body);
    await book.save();
    res.status(201).json({ message: 'Book added successfully', book });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAllBooks = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '' } = req.query;
    
    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) {
      filter.category = category;
    }

    const books = await LibraryBook.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await LibraryBook.countDocuments(filter);

    res.json({
      books,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBookById = async (req, res) => {
  try {
    const book = await LibraryBook.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateBook = async (req, res) => {
  try {
    const book = await LibraryBook.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book updated successfully', book });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteBook = async (req, res) => {
  try {
    const book = await LibraryBook.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const issueBook = async (req, res) => {
  try {
    const { studentId, bookId, dueDays = 15 } = req.body;
    
    const student = await Student.findById(studentId).populate('user');
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const book = await LibraryBook.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    if (book.available_copies < 1) {
      return res.status(400).json({ error: 'Book not available' });
    }

    if (student.currently_borrowed_books >= student.max_books_allowed) {
      return res.status(400).json({ error: 'Student has reached maximum book limit' });
    }

    const existingTransaction = await BookTransaction.findOne({
      student: studentId,
      book: bookId,
      status: 'issued'
    });
    if (existingTransaction) {
      return res.status(400).json({ error: 'Student already has this book issued' });
    }

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    const transaction = new BookTransaction({
      student: studentId,
      book: bookId,
      issue_date: issueDate,
      due_date: dueDate,
      status: 'issued'
    });

    book.available_copies -= 1;
    student.currently_borrowed_books += 1;

    await Promise.all([transaction.save(), book.save(), student.save()]);

    res.status(201).json({ 
      message: 'Book issued successfully', 
      transaction,
      student: student.user.name,
      book: book.title
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const returnBook = async (req, res) => {
  try {
    const { transactionId } = req.body;
    
    const transaction = await BookTransaction.findById(transactionId)
      .populate('student')
      .populate('book');
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    if (transaction.status === 'returned') {
      return res.status(400).json({ error: 'Book already returned' });
    }

    const returnDate = new Date();
    let fineAmount = 0;

    if (returnDate > transaction.due_date) {
      const overdueDays = Math.ceil((returnDate - transaction.due_date) / (1000 * 60 * 60 * 24));
      fineAmount = overdueDays * 5;
    }

    transaction.return_date = returnDate;
    transaction.fine_amount = fineAmount;
    transaction.status = 'returned';

    transaction.book.available_copies += 1;
    transaction.student.currently_borrowed_books -= 1;

    await Promise.all([
      transaction.save(),
      transaction.book.save(),
      transaction.student.save()
    ]);

    res.json({ 
      message: 'Book returned successfully', 
      transaction,
      fineAmount
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const transactions = await BookTransaction.find(filter)
      .populate({
        path: 'student',
        select: 'user department year mobile_number currently_borrowed_books',
        populate: {
          path: 'user',
          select: 'name email role'
        }
      })
      .populate('book', 'title author isbn category')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await BookTransaction.countDocuments(filter);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getLibraryStats = async (req, res) => {
  try {
    const totalBooks = await LibraryBook.countDocuments();
    const totalTransactions = await BookTransaction.countDocuments();
    const issuedBooks = await BookTransaction.countDocuments({ status: 'issued' });
    const overdueBooks = await BookTransaction.countDocuments({ status: 'issued', due_date: { $lt: new Date() } });
    
    const popularBooks = await BookTransaction.aggregate([
      { $group: { _id: '$book', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'librarybooks', localField: '_id', foreignField: '_id', as: 'book' } },
      { $unwind: '$book' }
    ]);

    res.json({
      totalBooks,
      totalTransactions,
      issuedBooks,
      overdueBooks,
      popularBooks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate('user', 'name email')
      .select('user mobile_number department year currently_borrowed_books max_books_allowed')
      .sort({ 'user.name': 1 });

    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

const getStudentBooks = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id });
    
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const transactions = await BookTransaction.find({
      student: student._id,
      status: 'issued'
    })
    .populate('book', 'title author isbn')
    .sort({ due_date: 1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student books' });
  }
};

module.exports = {
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
  getStudentBooks
};