const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const investmentController = require('../controllers/investmentController');

// User views own investments
router.get('/my', authenticate, investmentController.getMyInvestments);
router.get('/my/:id', authenticate, investmentController.getMyInvestmentById);

// Admin CRUD
router.post('/', authenticate, authorizeAdmin, investmentController.createInvestment);
router.put('/:id', authenticate, authorizeAdmin, investmentController.updateInvestment);
router.delete('/:id', authenticate, authorizeAdmin, investmentController.deleteInvestment);
router.get('/', authenticate, authorizeAdmin, investmentController.getAllInvestments);
router.get('/:id', authenticate, authorizeAdmin, investmentController.getInvestmentDetails);

// Admin upload documents for investment
router.post('/:id/documents', authenticate, authorizeAdmin, investmentController.uploadInvestmentDocs);

module.exports = router;