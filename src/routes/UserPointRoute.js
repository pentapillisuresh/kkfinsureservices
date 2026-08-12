const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const userPointController = require('../controllers/userPointController');

// User views own points
router.get('/my', authenticate, userPointController.getMyPoints);
router.get('/my/history', authenticate, userPointController.getMyPointHistory);

// Admin manages points
router.get('/', authenticate, authorizeAdmin, userPointController.getAllPoints);
router.get('/user/:userId', authenticate, authorizeAdmin, userPointController.getUserPoints);
router.post('/', authenticate, authorizeAdmin, userPointController.addPoints);
router.post('/batch', authenticate, authorizeAdmin, userPointController.batchAddPoints);
router.delete('/:id', authenticate, authorizeAdmin, userPointController.deletePointEntry);

// Admin can expire points
router.put('/:id', authenticate, authorizeAdmin, userPointController.updateUserPoint);
router.put('/:id/expire', authenticate, authorizeAdmin, userPointController.expirePoints);

module.exports = router;