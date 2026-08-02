const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const imagesDir = path.join(uploadDir, 'images');
const documentsDir = path.join(uploadDir, 'documents');
[uploadDir, imagesDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = uploadDir;
    if (file.mimetype.startsWith('image/')) {
      dest = imagesDir;
    } else if (file.mimetype === 'application/pdf') {
      dest = documentsDir;
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, WEBP images and PDFs are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

module.exports = upload;