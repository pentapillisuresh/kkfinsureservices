const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const bankDetailController = require('../controllers/bankDetailController');

// User route – view own bank details
router.get('/my', authenticate, bankDetailController.getMyBankDetails);

// Admin routes
router.get('/user/:userId', authenticate, authorizeAdmin, bankDetailController.getUserBankDetails);
router.put('/user/:userId', authenticate, authorizeAdmin, bankDetailController.upsertBankDetails);
router.delete('/user/:userId', authenticate, authorizeAdmin, bankDetailController.deleteBankDetails);
router.patch('/user/:userId/verify', authenticate, authorizeAdmin, bankDetailController.verifyBankDetails);

module.exports = router;