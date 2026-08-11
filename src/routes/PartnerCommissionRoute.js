const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const partnerCommissionController = require('../controllers/partnerCommissionController');

// User views own commissions
router.get('/my', authenticate, partnerCommissionController.getMyCommissions);

// Admin manages all commissions
router.get('/', authenticate, authorizeAdmin, partnerCommissionController.getAllCommissions);
router.get('/:id', authenticate, authorizeAdmin, partnerCommissionController.getCommissionById);
router.get('/user/:userId', authenticate, authorizeAdmin, partnerCommissionController.getUserCommissions);

// Admin processes commissions (monthly)
router.post('/process', authenticate, authorizeAdmin, partnerCommissionController.processMonthlyCommissions);
router.post('/', authenticate, authorizeAdmin, partnerCommissionController.createCommissions);

// Admin marks commissions as paid
router.put('/:id/pay', authenticate, authorizeAdmin, partnerCommissionController.markAsPaid);
router.put('/batch/pay', authenticate, authorizeAdmin, partnerCommissionController.batchMarkAsPaid);

module.exports = router;