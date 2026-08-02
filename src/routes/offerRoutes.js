const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const offerController = require('../controllers/offerController');

// Any authenticated user can view active offers
router.get('/', authenticate, offerController.getActiveOffers);
router.get('/:id', authenticate, offerController.getOfferById);

// Admin-only
router.post('/', authenticate, authorizeAdmin, offerController.createOffer);
router.put('/:id', authenticate, authorizeAdmin, offerController.updateOffer);
router.delete('/:id', authenticate, authorizeAdmin, offerController.deleteOffer);
router.patch('/:id/status', authenticate, authorizeAdmin, offerController.toggleOfferStatus);

// Apply offer to a referral (authenticated)
router.post('/apply', authenticate, offerController.applyOfferToReferral);

module.exports = router;