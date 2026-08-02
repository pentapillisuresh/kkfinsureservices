const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const partnerTierController = require('../controllers/partnerTierController');

// Any authenticated user can view active tiers
router.get('/', authenticate, partnerTierController.getActiveTiers);
router.get('/:id', authenticate, partnerTierController.getTierById);

// Admin CRUD
router.post('/', authenticate, authorizeAdmin, partnerTierController.createTier);
router.put('/:id', authenticate, authorizeAdmin, partnerTierController.updateTier);
router.delete('/:id', authenticate, authorizeAdmin, partnerTierController.deleteTier);
router.patch('/:id/status', authenticate, authorizeAdmin, partnerTierController.toggleTierStatus);

// Admin can assign tier to a user
router.put('/user/:userId/tier', authenticate, authorizeAdmin, partnerTierController.assignTierToUser);

module.exports = router;