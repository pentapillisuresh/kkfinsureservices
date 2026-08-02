const { Op } = require('sequelize');
const {BalanceSheet} = require('../models');
const {User} = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

/**
 * Get authenticated user's balance sheets
 */
const getMyBalanceSheets = async (req, res) => {
  try {
    const { periodStart, periodEnd, limit = 20, offset = 0 } = req.query;
    const where = { userId: req.user.id };

    if (periodStart && periodEnd) {
      where.periodStart = { [Op.gte]: new Date(periodStart) };
      where.periodEnd = { [Op.lte]: new Date(periodEnd) };
    }

    const { count, rows } = await BalanceSheet.findAndCountAll({
      where,
      order: [['generatedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      balanceSheets: rows,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    }, 'Balance sheets fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get a specific balance sheet by ID for the authenticated user
 */
const getMyBalanceSheetById = async (req, res) => {
  try {
    const { id } = req.params;
    const balanceSheet = await BalanceSheet.findOne({
      where: { id, userId: req.user.id }
    });

    if (!balanceSheet) {
      return errorResponse(res, 'Balance sheet not found', 404);
    }

    return successResponse(res, balanceSheet, 'Balance sheet fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get balance sheets for a specific user
 */
const getUserBalanceSheets = async (req, res) => {
  try {
    const { userId } = req.params;
    const { periodStart, periodEnd, limit = 20, offset = 0 } = req.query;

    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const where = { userId };
    if (periodStart && periodEnd) {
      where.periodStart = { [Op.gte]: new Date(periodStart) };
      where.periodEnd = { [Op.lte]: new Date(periodEnd) };
    }

    const { count, rows } = await BalanceSheet.findAndCountAll({
      where,
      order: [['generatedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      balanceSheets: rows,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    }, 'User balance sheets fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get a specific balance sheet by ID for any user
 */
const getUserBalanceSheetById = async (req, res) => {
  try {
    const { userId, id } = req.params;
    const balanceSheet = await BalanceSheet.findOne({
      where: { id, userId }
    });

    if (!balanceSheet) {
      return errorResponse(res, 'Balance sheet not found', 404);
    }

    return successResponse(res, balanceSheet, 'Balance sheet fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Generate balance sheet for a user (calls adminController's method)
 * This is a wrapper; actual generation logic is in adminController
 */
const generateBalanceSheet = async (req, res) => {
  // Re-use admin controller function; we'll redirect to adminController
  const adminController = require('./adminController');
  return adminController.generateBalanceSheet(req, res);
};

module.exports = {
  getMyBalanceSheets,
  getMyBalanceSheetById,
  getUserBalanceSheets,
  getUserBalanceSheetById,
  generateBalanceSheet
};