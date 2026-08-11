const { Op } = require('sequelize');
const { Return } = require('../models');
const { Investment } = require('../models');
const { User } = require('../models');
const { Plan } = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const { calculateMonthlyReturn, calculateAnnualBonus, isSeniorCitizen } = require('../utils/helpers');
const sequelize = require('../config/database');

/**
 * Get authenticated user's returns
 */
const getMyReturns = async (req, res) => {
  try {
    const { type, month, limit = 20, offset = 0 } = req.query;
    const where = { userId: req.user.id };
    if (type) where.type = type;
    if (month) where.month = month;

    const { count, rows } = await Return.findAndCountAll({
      where,
      include: [{ model: Investment, as: 'investment' }],
      order: [['month', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      returns: rows,
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    }, 'Returns fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get summary of returns for authenticated user
 */
const getMyReturnSummary = async (req, res) => {
  try {
    const totalReturns = await Return.sum('amount', { where: { userId: req.user.id } });
    const monthlyReturns = await Return.sum('amount', { where: { userId: req.user.id, type: 'monthly' } });
    const annualBonuses = await Return.sum('amount', { where: { userId: req.user.id, type: 'annual_bonus' } });
    const quarterlySenior = await Return.sum('amount', { where: { userId: req.user.id, type: 'quarterly_senior' } });

    return successResponse(res, {
      totalReturns: totalReturns || 0,
      monthlyReturns: monthlyReturns || 0,
      annualBonuses: annualBonuses || 0,
      quarterlySenior: quarterlySenior || 0
    }, 'Return summary fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get all returns with filters
 */
const getAllReturns = async (req, res) => {
  try {
    const { userId, investmentId, type, month, limit = 20, offset = 0 } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (investmentId) where.investmentId = investmentId;
    if (type) where.type = type;
    if (month) where.month = month;

    const { count, rows } = await Return.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: Investment, as: 'investment' }
      ],
      order: [['month', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      returns: rows,
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    }, 'All returns fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get returns for a specific user
 */
const getUserReturns = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, month, limit = 20, offset = 0 } = req.query;

    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const where = { userId };
    if (type) where.type = type;
    if (month) where.month = month;

    const { count, rows } = await Return.findAndCountAll({
      where,
      include: [{ model: Investment, as: 'investment' }],
      order: [['month', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      returns: rows,
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    }, 'User returns fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get return by ID
 */
const getReturnById = async (req, res) => {
  try {
    const { id } = req.params;
    const returnRecord = await Return.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: Investment, as: 'investment' }
      ]
    });

    if (!returnRecord) {
      return errorResponse(res, 'Return record not found', 404);
    }

    return successResponse(res, returnRecord, 'Return fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Generate returns manually (for a specific month)
 * This can be called via cron or manually
 */
const generateReturnByUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { month, investmentId,offerId } = req.body; // YYYY-MM-DD
    if (!month) {
      return errorResponse(res, 'Month is required (YYYY-MM-DD)', 400);
    }

    const monthDate = new Date(month);
    const year = monthDate.getFullYear();
    const monthIndex = monthDate.getMonth();

    // Get all active investments
    const investment = await Investment.findOne({
      where: {
        status: 'active',
        id: investmentId,
        maturityDate: { [Op.gt]: new Date() }
      },
      include: [
        { model: User, as: 'user' },
        { model: Plan, as: 'plan' }
      ],
      transaction
    });

    const user = investment.user;
    const plan = investment.plan;
    const monthlyAmount = calculateMonthlyReturn(investment.amount, plan.monthlyReturnPercent);

    // Check if senior citizen
    const isSenior = user.isSeniorCitizen || isSeniorCitizen(user.dateOfBirth);
    let returnType = 'monthly';
    let amount = monthlyAmount;

    // if (isSenior) {
    //   // Only generate quarterly on first month of quarter
    //   if (monthIndex % 3 === 0) {
    //     returnType = 'quarterly_senior';
    //     amount = monthlyAmount * 3;
    //   } else {
    //     // Skip this month for seniors (only quarterly)
    //     continue;
    //   }
    // }

    // Check if return already exists for this month and investment
    const existing = await Return.findOne({
      where: {
        investmentId: investment.id,
        month: monthDate,
        type: returnType
      },
      transaction
    });

    if (!existing) {
      await Return.create({
        investmentId: investment.id,
        userId: user.id,
        month: monthDate,
        amount,
        offerId,
        type: returnType,
        paidOn: new Date()
      }, { transaction });
    }

    await transaction.commit();
    return successResponse(res, `return generated for month ${month}`);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, 500);
  }
};
/**
 * Admin: Generate returns manually (for a specific month)
 * This can be called via cron or manually
 */
const generateReturns = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { month } = req.body; // YYYY-MM-DD
    if (!month) {
      return errorResponse(res, 'Month is required (YYYY-MM-DD)', 400);
    }

    const monthDate = new Date(month);
    const year = monthDate.getFullYear();
    const monthIndex = monthDate.getMonth();

    // Get all active investments
    const investments = await Investment.findAll({
      where: {
        status: 'active',
        maturityDate: { [Op.gt]: new Date() }
      },
      include: [
        { model: User, as: 'user' },
        { model: Plan, as: 'plan' }
      ],
      transaction
    });

    let generated = 0;
    for (const investment of investments) {
      const user = investment.user;
      const plan = investment.plan;
      const monthlyAmount = calculateMonthlyReturn(investment.amount, plan.monthlyReturnPercent);

      // Check if senior citizen
      const isSenior = user.isSeniorCitizen || isSeniorCitizen(user.dateOfBirth);
      let returnType = 'monthly';
      let amount = monthlyAmount;

      // if (isSenior) {
      //   // Only generate quarterly on first month of quarter
      //   if (monthIndex % 3 === 0) {
      //     returnType = 'quarterly_senior';
      //     amount = monthlyAmount * 3;
      //   } else {
      //     // Skip this month for seniors (only quarterly)
      //     continue;
      //   }
      // }

      // Check if return already exists for this month and investment
      const existing = await Return.findOne({
        where: {
          investmentId: investment.id,
          month: monthDate,
          type: returnType
        },
        transaction
      });

      if (!existing) {
        await Return.create({
          investmentId: investment.id,
          userId: user.id,
          month: monthDate,
          amount,
          type: returnType,
          paidOn: new Date()
        }, { transaction });
        generated++;
      }
    }

    await transaction.commit();
    return successResponse(res, { generated }, `${generated} returns generated for month ${month}`);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Generate annual bonuses manually
 */
const generateAnnualBonuses = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { year } = req.body; // YYYY
    if (!year) {
      return errorResponse(res, 'Year is required (YYYY)', 400);
    }

    const yearInt = parseInt(year);
    const startDate = new Date(yearInt, 0, 1);
    const endDate = new Date(yearInt, 11, 31, 23, 59, 59);

    // Find investments that have completed 1 year in this year
    const investments = await Investment.findAll({
      where: {
        status: 'active',
        investmentDate: {
          [Op.between]: [
            new Date(yearInt - 1, 0, 1),
            new Date(yearInt - 1, 11, 31, 23, 59, 59)
          ]
        }
      },
      include: [{ model: Plan, as: 'plan' }],
      transaction
    });

    let generated = 0;
    for (const investment of investments) {
      const bonusAmount = calculateAnnualBonus(investment.amount, investment.plan.annualBonusPercent);

      // Check if annual bonus already exists for this investment in this year
      const existing = await Return.findOne({
        where: {
          investmentId: investment.id,
          type: 'annual_bonus',
          month: { [Op.between]: [startDate, endDate] }
        },
        transaction
      });

      if (!existing) {
        await Return.create({
          investmentId: investment.id,
          userId: investment.userId,
          month: new Date(yearInt, 11, 31), // Dec 31
          amount: bonusAmount,
          type: 'annual_bonus',
          paidOn: new Date()
        }, { transaction });
        generated++;
      }
    }

    await transaction.commit();
    return successResponse(res, { generated }, `${generated} annual bonuses generated for year ${year}`);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Mark a return as paid
 */
const markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const returnRecord = await Return.findByPk(id);
    if (!returnRecord) {
      return errorResponse(res, 'Return record not found', 404);
    }

    if (returnRecord.paidOn) {
      return errorResponse(res, 'Return already paid', 400);
    }

    returnRecord.paidOn = new Date();
    await returnRecord.save();

    return successResponse(res, returnRecord, 'Return marked as paid');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Batch mark returns as paid
 */
const batchMarkAsPaid = async (req, res) => {
  try {
    const { ids } = req.body; // array of return IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'IDs array is required', 400);
    }

    const [updated] = await Return.update(
      { paidOn: new Date() },
      { where: { id: { [Op.in]: ids }, paidOn: null } }
    );

    return successResponse(res, { updated }, `${updated} returns marked as paid`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getMyReturns,
  getMyReturnSummary,
  getAllReturns,
  getUserReturns,
  getReturnById,
  generateReturns,
  generateAnnualBonuses,
  markAsPaid,
  generateReturnByUser,
  batchMarkAsPaid
};