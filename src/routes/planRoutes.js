const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const planController = require('../controllers/planController');

// Public routes (any authenticated user can view plans)
router.get('/', authenticate, planController.getAllPlans);
router.get('/:id', authenticate, planController.getPlanById);

// Admin-only routes
router.post('/', authenticate, authorizeAdmin, planController.createPlan);
router.put('/:id', authenticate, authorizeAdmin, planController.updatePlan);
router.delete('/:id', authenticate, authorizeAdmin, planController.deletePlan);
router.patch('/:id/status', authenticate, authorizeAdmin, planController.togglePlanStatus);

module.exports = router;