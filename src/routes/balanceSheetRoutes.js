const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const balanceSheetController = require('../controllers/balanceSheetController');
const adminController = require('../controllers/adminController');

// User views own balance sheets
router.get('/my', authenticate, balanceSheetController.getMyBalanceSheets);
router.get('/my/:id', authenticate, balanceSheetController.getMyBalanceSheetById);
router.get('/my/generate/', authenticate, adminController.getMyBalanceSheetGenerateById);

// Admin views any user's balance sheets
router.get('/user/:userId', authenticate, authorizeAdmin, balanceSheetController.getUserBalanceSheets);
router.get('/user/:userId/:id', authenticate, authorizeAdmin, balanceSheetController.getUserBalanceSheetById);
router.post('/generate', authenticate, authorizeAdmin, balanceSheetController.generateBalanceSheet);

module.exports = router;