const { Op } = require('sequelize');
const { Investment } = require('../models');
const { User } = require('../models');
const { Plan } = require('../models');
const { Referral } = require('../models');
const { Offer } = require('../models');
const { Return } = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const { calculateMaturityDate } = require('../utils/helpers');
const sequelize = require('../config/database');

/**
 * Create a new investment (admin only)
 */

const createInvestment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { userId, planId, amount, investmentDate } = req.body;

    // 1. Validate user
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return errorResponse(res, 'User not found', 404);
    }

    // 2. Validate plan
    const plan = await Plan.findByPk(planId, { transaction });
    if (!plan) {
      await transaction.rollback();
      return errorResponse(res, 'Plan not found', 404);
    }
    if (!plan.isActive) {
      await transaction.rollback();
      return errorResponse(res, 'Plan is not active', 400);
    }

    // 3. Validate amount range
    if (amount < plan.minInvestment || amount > plan.maxInvestment) {
      await transaction.rollback();
      return errorResponse(res, `Investment amount must be between ${plan.minInvestment} and ${plan.maxInvestment}`, 400);
    }

    // 4. Calculate maturity date
    const investmentDateObj = new Date(investmentDate);
    const maturityDate = calculateMaturityDate(investmentDateObj, plan.maturityPeriod);

    // 5. Create investment
    const investment = await Investment.create({
      userId,
      planId,
      amount,
      investmentDate: investmentDateObj,
      maturityDate,
      status: 'active'
    }, { transaction });

    // 6. Create referral if user has referrerId
    if (user.referrerId) {
      const rewardValue = (amount / 100).toFixed(2);
      const rewardPoints = Math.round(amount / 100);

      // Find applicable offer
      const now = new Date();
      let applicableOffer = null;
      const activeOffers = await Offer.findAll({ where: { isActive: true }, transaction });
      for (const offer of activeOffers) {
        const conditions = offer.conditions || {};
        if (conditions.minInvestment && amount < conditions.minInvestment) continue;
        if (conditions.expiryDate && new Date(conditions.expiryDate) < now) continue;
        applicableOffer = offer;
        break;
      }

      await Referral.create({
        referrerId: user.referrerId,
        referredUserId: user.id,
        investmentAmount: amount,
        rewardPoints,
        rewardValue,
        expireDate: investment.maturityDate,
        offerId: applicableOffer ? applicableOffer.id : null,
        rewardType: applicableOffer ? applicableOffer.rewardType : 'points',
      }, { transaction });
    }

    // 7. Generate Returns
    const monthlyReturnAmount = (amount * plan.monthlyReturnPercent) / 100;
    const isSenior = user.isSeniorCitizen;

    const firstReturnMonth = new Date(investmentDateObj.getFullYear(), investmentDateObj.getMonth() + 1, 1);
    const lastReturnMonth = new Date(maturityDate.getFullYear(), maturityDate.getMonth(), 1);
    let monthNumber = 1
    let currentMonth = new Date(firstReturnMonth);
    while (currentMonth <= lastReturnMonth) {
      let returnType = 'monthly';
      let returnAmount = monthlyReturnAmount;
      let roi = plan.monthlyReturnPercent;
      if (isSenior) {
        const monthDiff = (currentMonth.getFullYear() - firstReturnMonth.getFullYear()) * 12 +
          (currentMonth.getMonth() - firstReturnMonth.getMonth());
        if (monthDiff % 3 === 0) {
          returnType = 'quarterly_senior';
          returnAmount = monthlyReturnAmount * 3;
        } else {
          // Skip months that are not quarter starts
          currentMonth.setMonth(currentMonth.getMonth() + 1);
          continue;
        }
      }
      await Return.create({
        investmentId: investment.id,
        userId: user.id,
        month: currentMonth,
        amount: returnAmount,
        type: returnType,
        monthNo: isSenior ? monthNumber * 3 : monthNumber,
        ROI: isSenior ? roi * monthNumber * 3 : roi * monthNumber,
        paidOn: null, // pending
      }, { transaction });
      monthNumber++
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    await transaction.commit();
    return successResponse(res, investment, 'Investment created successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating investment:', error);
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
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'batchId'] },
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

const getAllInvestmentsByUserID = async (req, res) => {
  try {
    const { userId } = req.params;
    const where = {};
    if (userId) where.userId = userId;
    where.status = "active";

    const investments = await Investment.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'batchId'] },
        { model: Plan, as: 'plan' }
      ],
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, {
      investments,
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
    if (status) where.status = status;

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
  getAllInvestmentsByUserID,
  getMyInvestmentById,
  uploadInvestmentDocs
};