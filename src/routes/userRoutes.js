const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const userController = require('../controllers/userController');

// All routes require authentication
router.use(authenticate);

router.get('/profile', userController.getProfile);
router.get('/investments', userController.getInvestments);
router.get('/Dashboard', userController.getDashboardData);
router.get('/balance-sheet', userController.getBalanceSheet);
router.get('/documents', userController.getDocuments);
router.get('/returns', userController.getReturns);
router.get('/referrals', userController.getReferrals);
router.get('/points', userController.getPoints);
router.post('/ticket', userController.createTicket);
router.get('/tickets', userController.getTickets);

module.exports = router;