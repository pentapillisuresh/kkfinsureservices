const { Op } = require('sequelize');
const { PartnerCommission } = require('../models');
const { User } = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const sequelize = require('../config/database');

/**
 * Get authenticated partner's own commissions
 */
const getMyCommissions = async (req, res) => {
  try {
    const { status, year, month, limit = 20, offset = 0 } = req.query;
    const where = { partnerId: req.user.id };

    if (status) where.status = status;
    if (year && month) {
      const dateObj = new Date(year, month - 1, 1);
      where.month = { [Op.between]: [dateObj, new Date(year, month, 0)] };
    }

    const { count, rows } = await PartnerCommission.findAndCountAll({
      where,
      order: [['month', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      commissions: rows,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    }, 'Commissions fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get all commissions
 */
const getAllCommissions = async (req, res) => {
  try {
    const { partnerId, status, year, month, page = 1, limit = 20 } = req.query;
    const where = {};
    if (partnerId) where.partnerId = partnerId;
    if (status) where.status = status;
    if (year && month) {
      const dateObj = new Date(year, month - 1, 1);
      where.month = { [Op.between]: [dateObj, new Date(year, month, 0)] };
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await PartnerCommission.findAndCountAll({
      where,
      include: [{ model: User, as: 'partner', attributes: ['id', 'fullName', 'email', 'partnerType'] }],
      order: [['month', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      commissions: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    }, 'Commissions fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get commission by ID
 */
const getCommissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const commission = await PartnerCommission.findByPk(id, {
      include: [{ model: User, as: 'partner', attributes: ['id', 'fullName', 'email', 'partnerType'] }]
    });

    if (!commission) {
      return errorResponse(res, 'Commission record not found', 404);
    }

    return successResponse(res, commission, 'Commission fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get commissions for a specific user
 */
const getUserCommissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, year, month, limit = 20, offset = 0 } = req.query;

    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const where = { partnerId: userId };
    if (status) where.status = status;
    if (year && month) {
      const dateObj = new Date(year, month - 1, 1);
      where.month = { [Op.between]: [dateObj, new Date(year, month, 0)] };
    }

    const { count, rows } = await PartnerCommission.findAndCountAll({
      where,
      order: [['month', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      commissions: rows,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    }, 'User commissions fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Process monthly commissions (calls scheduler service)
 */
const processMonthlyCommissions = async (req, res) => {
  const { month, paidOn } = req.body
  try {
    const { processMonthlyCommissions } = require('../service/commissionService');
    await processMonthlyCommissions(month, paidOn);
    return successResponse(res, null, 'Monthly commissions processed successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Mark a commission as paid
 */
const markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const commission = await PartnerCommission.findByPk(id);
    if (!commission) {
      return errorResponse(res, 'Commission record not found', 404);
    }

    if (commission.status === 'paid') {
      return errorResponse(res, 'Commission already marked as paid', 400);
    }

    commission.status = 'paid';
    commission.paidOn = new Date();
    await commission.save();

    return successResponse(res, commission, 'Commission marked as paid');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Batch mark commissions as paid for a specific month
 */
const batchMarkAsPaid = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return errorResponse(res, 'Month and year are required', 400);
    }

    const dateObj = new Date(year, month - 1, 1);
    const [updated] = await PartnerCommission.update(
      { status: 'paid', paidOn: new Date() },
      {
        where: {
          month: {
            [Op.between]: [dateObj, new Date(year, month, 0)]
          },
          status: 'pending'
        }
      }
    );

    return successResponse(res, { updatedCount: updated }, `${updated} commission(s) marked as paid`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const createCommissions = async (req, res) => {
  try {
  const {partnerId,month,totalInvestmentBase,commissionRate,commissionAmount,status,paidOn} = req.body;
  
  // Check required fields
  if (
    !partnerId ||
    !month ||
    totalInvestmentBase === undefined ||
    commissionRate === undefined ||
    commissionAmount === undefined
  ) {
    return errorResponse(
      res,
      'partnerId, month, totalInvestmentBase, commissionRate and commissionAmount are required',
      400
    );
  }
  
  // Check if commission already exists for this partner and month
  const existing = await PartnerCommission.findOne({
    where: {
      partnerId,
      month
    }
  });
  
  if (existing) {
    return errorResponse(
      res,
      'This commission already exists for this partner and month',
      409
    );
  }
  
  // Create commission
  const commission = await PartnerCommission.create({
    partnerId,
    month,
    totalInvestmentBase,
    commissionRate,
    commissionAmount,
    status: status || 'pending',
    paidOn: paidOn || null
  });
  
  return successResponse(
    res,
    {
      commission
    },
    'Commission created successfully'
  );
  
  } catch (error) {
  console.error('Create commission error:', error);
  
  return errorResponse(
    res,
    error.message || 'Failed to create commission',
    500
  );
  }};
  
module.exports = {
  getMyCommissions,
  getAllCommissions,
  getCommissionById,
  getUserCommissions,
  processMonthlyCommissions,
  markAsPaid,
  createCommissions,
  batchMarkAsPaid
};