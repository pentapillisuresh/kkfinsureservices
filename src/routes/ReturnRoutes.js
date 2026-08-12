const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const returnController = require('../controllers/returnController');

// User views own returns
router.get('/my', authenticate, returnController.getMyReturns);
router.get('/my/summary', authenticate, returnController.getMyReturnSummary);

// Admin views all returns
router.get('/', authenticate, authorizeAdmin, returnController.getAllReturns);
router.get('/user/:userId', authenticate, authorizeAdmin, returnController.getUserReturns);
router.get('/:id', authenticate, authorizeAdmin, returnController.getReturnById);

// Admin can generate returns (manual trigger)
router.post('/', authenticate, authorizeAdmin, returnController.generateReturnByUser);
router.post('/generate', authenticate, authorizeAdmin, returnController.generateReturns);
router.post('/generate/annual-bonus', authenticate, authorizeAdmin, returnController.generateAnnualBonuses);

// Admin marks returns as paid (payout)
router.put('/:id', authenticate, authorizeAdmin, returnController.updateReturn);
router.put('/:id/pay', authenticate, authorizeAdmin, returnController.markAsPaid);
router.put('/batch/pay', authenticate, authorizeAdmin, returnController.batchMarkAsPaid);

module.exports = router;