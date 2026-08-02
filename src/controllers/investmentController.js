const { Op } = require('sequelize');
const {Investment} = require('../models');
const {User} = require('../models');
const {Plan} = require('../models');
const {Referral} = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const { calculateMaturityDate } = require('../utils/helpers');

/**
 * Create a new investment (admin only)
 */
const createInvestment = async (req, res) => {
  try {
    const { userId, planId, amount, investmentDate } = req.body;

    // Validate user
    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Validate plan
    const plan = await Plan.findByPk(planId);
    if (!plan) {
      return errorResponse(res, 'plan not found', 404);
    }

    if (!plan.isActive) {
      return errorResponse(res, 'plan is not active', 400);
    }

    // Validate amount range
    if (amount < plan.minInvestment || amount > plan.maxInvestment) {
      return errorResponse(res, `Investment amount must be between ${plan.minInvestment} and ${plan.maxInvestment}`, 400);
    }

    // Calculate maturity date
    const maturityDate = calculateMaturityDate(new Date(investmentDate), plan.maturityPeriod);

    const investment = await Investment.create({
      userId,
      planId,
      amount,
      investmentDate: new Date(investmentDate),
      maturityDate,
      status: 'active'
    });

    // Update referral rewards if user was referred
    // Check if this user was referred by someone
    const referral = await Referral.findOne({
      where: { referredUserId: userId, investmentAmount: null }
    });

    if (referral) {
      // Update referral with investment amount and award points
      referral.investmentAmount = amount;
      // Determine reward based on some logic (could be from Offer)
      // For now, award 1 point per 1000 rupees invested
      const points = Math.floor(amount / 1000);
      referral.rewardPoints = points;
      await referral.save();

      // Also add points to referrer's UserPoint
      await UserPoint.create({
        userId: referral.referrerId,
        points: points,
        source: 'referral',
        referenceId: referral.id,
        description: `Referral reward for investment of ₹${amount}`
      });
    }

    // If user is a partner (referrer), their commission base will be updated in scheduled job
    // So no immediate action needed

    return successResponse(res, investment, 'Investment created successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update investment (admin only)
 */
const updateInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, status, agreementDoc, certificateDoc, postChequeDoc } = req.body;

    const investment = await Investment.findByPk(id);
    if (!investment) {
      return errorResponse(res, 'Investment not found', 404);
    }

    await investment.update({
      amount: amount || investment.amount,
      status: status || investment.status,
      agreementDoc: agreementDoc || investment.agreementDoc,
      certificateDoc: certificateDoc || investment.certificateDoc,
      postChequeDoc: postChequeDoc || investment.postChequeDoc
    });

    return successResponse(res, investment, 'Investment updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete investment (admin only)
 */
const deleteInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const investment = await Investment.findByPk(id);
    if (!investment) {
      return errorResponse(res, 'Investment not found', 404);
    }

    // Check if investment has any returns (maybe prevent deletion if returns exist)
    const returnCount = await Return.count({ where: { investmentId: id } });
    if (returnCount > 0) {
      return errorResponse(res, 'Cannot delete investment with existing returns. Close it instead.', 400);
    }

    await investment.destroy();
    return successResponse(res, null, 'Investment deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all investments (admin only)
 */
const getAllInvestments = async (req, res) => {
  try {
    const { userId, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const offset = (page - 1) * limit;

    const { count, rows } = await Investment.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email','batchId'] },
        { model: Plan, as: 'plan' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, {
      investments: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    }, 'Investments fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get investment details by ID (admin only)
 */
const getInvestmentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const investment = await Investment.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: Plan, as: 'plan' },
        { model: Return, as: 'returns' }
      ]
    });

    if (!investment) {
      return errorResponse(res, 'Investment not found', 404);
    }

    return successResponse(res, investment, 'Investment details fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get authenticated user's own investments
 */
const getMyInvestments = async (req, res) => {
  try {
    const { status } = req.query;
    const where = { userId: req.user.id };
    if (status) where.status = status ;

    const investments = await Investment.findAll({
      where,
      include: [{ model: Plan, as: 'plan' }],
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, investments, 'Your investments fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get specific investment for authenticated user
 */
const getMyInvestmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const investment = await Investment.findOne({
      where: { id, userId: req.user.id },
      include: [
        { model: Plan, as: 'plan' },
        { model: Return, as: 'returns' }
      ]
    });

    if (!investment) {
      return errorResponse(res, 'Investment not found', 404);
    }

    return successResponse(res, investment, 'Investment fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Upload documents for an investment (admin only)
 */
const uploadInvestmentDocs = async (req, res) => {
  try {
    const { id } = req.params;
    const { agreementDoc, certificateDoc, postChequeDoc } = req.body;

    const investment = await Investment.findByPk(id);
    if (!investment) {
      return errorResponse(res, 'Investment not found', 404);
    }

    // Files should have been uploaded separately; here we just update the paths
    // The actual file upload is handled by fileRoutes; admin can call this after upload
    await investment.update({
      agreementDoc: agreementDoc || investment.agreementDoc,
      certificateDoc: certificateDoc || investment.certificateDoc,
      postChequeDoc: postChequeDoc || investment.postChequeDoc
    });

    return successResponse(res, investment, 'Investment documents updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getAllInvestments,
  getInvestmentDetails,
  getMyInvestments,
  getMyInvestmentById,
  uploadInvestmentDocs
};