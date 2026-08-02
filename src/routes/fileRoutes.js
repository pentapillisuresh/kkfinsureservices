const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const fileController = require('../controllers/fileController');

// Admin-only uploads
router.post(
  '/single',
  authenticate,
  authorizeAdmin,
  upload.single('file'),
  fileController.uploadSingle
);
router.post(
  '/multiple',
  authenticate,
  authorizeAdmin,
  upload.array('files', 10),
  fileController.uploadMultiple
);

// Public (or user) access to download/ view? Not needed; static serving via Express
// If you need to serve files, you can add a route to stream files with auth check.

// Example: download file with authentication (optional)
router.get('/:filename', authenticate, fileController.downloadFile);

module.exports = router;