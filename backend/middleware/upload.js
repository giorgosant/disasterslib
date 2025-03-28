// backend/middleware/upload.js

const multer = require('multer');
const path = require('path');

// Define storage (using memory storage for easier processing)
const storage = multer.memoryStorage();

// Define file filter to accept only CSV and XLSX files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.csv', '.xlsx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and XLSX files are allowed.'));
  }
};

// Initialize multer with storage and file filter
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
});

module.exports = upload;
