const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const ticketController = require('../controllers/ticketController');

// User routes
router.get('/my', authenticate, ticketController.getMyTickets);
router.post('/', authenticate, ticketController.createTicket);
router.get('/my/:id', authenticate, ticketController.getMyTicketById);

// Admin routes
router.get('/', authenticate, authorizeAdmin, ticketController.getAllTickets);
router.get('/:id', authenticate, authorizeAdmin, ticketController.getTicketDetails);
router.put('/:id/status', authenticate, authorizeAdmin, ticketController.updateTicketStatus);
router.put('/:id/resolution', authenticate, authorizeAdmin, ticketController.addResolution);

module.exports = router;