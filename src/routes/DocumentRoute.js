const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const documentController = require('../controllers/documentController');
const upload = require('../middleware/upload');
// User views own documents
router.get('/my', authenticate, documentController.getMyDocuments);

// Admin manages documents
router.post('/', authenticate, authorizeAdmin,  upload.single('file'),documentController.uploadDocument);
router.get('/', authenticate, authorizeAdmin, documentController.getAllDocuments);
router.get('/:id', authenticate, authorizeAdmin, documentController.getDocumentById);
router.put('/:id', authenticate, authorizeAdmin, documentController.updateDocument);
router.delete('/:id', authenticate, authorizeAdmin, documentController.deleteDocument);
router.get('/user/:userId', authenticate, authorizeAdmin, documentController.getUserDocuments);

module.exports = router;