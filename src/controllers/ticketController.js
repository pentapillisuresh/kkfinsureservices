const {Ticket} = require('../models');
const {User} = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

/**
 * Get authenticated user's tickets
 */
const getMyTickets = async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    const where = { userId: req.user.id };
    if (status) where.status = status;

    const { count, rows } = await Ticket.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      tickets: rows,
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    }, 'Tickets fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get a specific ticket by ID for authenticated user
 */
const getMyTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findOne({
      where: { id, userId: req.user.id }
    });

    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404);
    }

    return successResponse(res, ticket, 'Ticket fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Create a ticket (user raises request to change personal details)
 */
const createTicket = async (req, res) => {
  try {
    const { subject, description } = req.body;

    const ticket = await Ticket.create({
      userId: req.user.id,
      subject,
      description,
      status: 'open'
    });

    return successResponse(res, ticket, 'Ticket created successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get all tickets with filters
 */
const getAllTickets = async (req, res) => {
  try {
    const { userId, status, limit = 20, offset = 0 } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const { count, rows } = await Ticket.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      tickets: rows,
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    }, 'All tickets fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get ticket by ID (full details)
 */
const getTicketDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }]
    });

    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404);
    }

    return successResponse(res, ticket, 'Ticket details fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Update ticket status
 */
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return errorResponse(res, 'Invalid status value', 400);
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404);
    }

    ticket.status = status;
    await ticket.save();

    return successResponse(res, ticket, 'Ticket status updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Add resolution to a ticket
 */
const addResolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    if (!resolution) {
      return errorResponse(res, 'Resolution text is required', 400);
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404);
    }

    ticket.resolution = resolution;
    ticket.status = 'resolved';
    await ticket.save();

    return successResponse(res, ticket, 'Resolution added and ticket marked as resolved');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getMyTickets,
  getMyTicketById,
  createTicket,
  getAllTickets,
  getTicketDetails,
  updateTicketStatus,
  addResolution
};