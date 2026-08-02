const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const referralController = require('../controllers/referralController');

// User routes
router.get('/my', authenticate, referralController.getMyReferrals);
router.post('/', authenticate, referralController.createReferral); // when a referred user invests
router.get('/my/stats', authenticate, referralController.getMyReferralStats);

// Admin routes
router.get('/', authenticate, authorizeAdmin, referralController.getAllReferrals);
router.get('/:id', authenticate, authorizeAdmin, referralController.getReferralDetails);
router.put('/:id/reward', authenticate, authorizeAdmin, referralController.updateReferralReward);
router.delete('/:id', authenticate, authorizeAdmin, referralController.deleteReferral);
router.get('/user/:userId', authenticate, authorizeAdmin, referralController.getUserReferrals);

module.exports = router;