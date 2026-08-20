const { Op,Sequelize } = require('sequelize');
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
    where.status = "active";
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
    const {
      userId,
      investmentId,
      type,
      month,
      search,
      limit = 20,
      offset = 0
    } = req.query;

    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);

    const where = {};

    // User filter
    if (userId) {
      where.userId = userId;
    }

    // Investment filter
    if (investmentId) {
      where.investmentId = investmentId;
    }

    // Type filter
    if (type) {
      where.type = type;
    }

    // Month filter – if "month" is provided in YYYY-MM format
    if (month) {
      const monthParts = month.split('-');
      if (monthParts.length === 2) {
        const year = parseInt(monthParts[0], 10);
        const monthNum = parseInt(monthParts[1], 10);
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 1);
        where.month = {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        };
      } else {
        // If not in YYYY-MM format, fallback to exact date match
        where.month = new Date(month);
      }
    }

    // Search – using LIKE for MySQL (case-insensitive via LOWER)
    if (search && search.trim()) {
      const searchValue = search.trim().toLowerCase();

      // We'll use Sequelize.literal with LOWER() for case-insensitive search
      const searchConditions = [
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('user.fullName')),
          { [Op.like]: `%${searchValue}%` }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('user.phone')),
          { [Op.like]: `%${searchValue}%` }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('user.batchId')),
          { [Op.like]: `%${searchValue}%` }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('investment.InvestmentCode')),
          { [Op.like]: `%${searchValue}%` }
        )
      ];

      // If any of these columns are NULL, we need to handle them.
      // We'll wrap each condition with a check for non-null.
      // Simpler: use Op.or with individual Sequelize.where.
      where[Op.or] = searchConditions;
    }

    // Perform the query with count and rows
    const { count, rows } = await Return.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email', 'phone', 'batchId'],
          required: false,
        },
        {
          model: Investment,
          as: 'investment',
          required: false,
        }
      ],
      order: [
        // Primary order: by user's full name (ascending)
        [{ model: User, as: 'user' }, 'fullName', 'ASC'],
        // Secondary order: by creation date (descending) for same names
        ['month', 'ASC']
      ],
      limit: parsedLimit,
      offset: parsedOffset,
      distinct: true, // ensures count is correct with includes
    });

    const page = Math.floor(parsedOffset / parsedLimit) + 1;
    const totalPages = Math.ceil(count / parsedLimit);

    return successResponse(
      res,
      {
        returns: rows,
        pagination: {
          total: count,
          page,
          limit: parsedLimit,
          totalPages,
        },
      },
      'All returns fetched successfully'
    );

  } catch (error) {
    console.error('getAllReturns error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = { getAllReturns };
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
    const { month, investmentId, offerId } = req.body; // YYYY-MM-DD
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

const updateReturn = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { 
      amount, 
      type, 
      status, 
      paidOn, 
      month, 
      description, 
      offerId,
      ROI 
    } = req.body;

    // 1. Find the existing return
    const returnRecord = await Return.findByPk(id, { transaction });
    if (!returnRecord) {
      await transaction.rollback();
      return errorResponse(res, 'Return not found', 404);
    }

    // 2. If month is being changed, validate that no other return exists for that month & investment
    if (month && month !== returnRecord.month) {
      const existing = await Return.findOne({
        where: {
          investmentId: returnRecord.investmentId,
          month: new Date(month),
          id: { [Op.ne]: id } // exclude itself
        },
        transaction
      });
      if (existing) {
        await transaction.rollback();
        return errorResponse(res, 'A return already exists for this investment and month', 400);
      }
    }

    // 3. If investment is active, we may allow updates; otherwise restrict? 
    // We'll allow updates regardless, but we could check if investment is still active.

    // 4. Perform update
    await returnRecord.update({
      amount: amount !== undefined ? amount : returnRecord.amount,
      type: type || returnRecord.type,
      status: status || returnRecord.status,
      paidOn: paidOn !== undefined ? new Date(paidOn) : returnRecord.paidOn,
      month: month ? new Date(month) : returnRecord.month,
      description: description !== undefined ? description : returnRecord.description,
      offerId: offerId !== undefined ? offerId : returnRecord.offerId,
      ROI: ROI !== undefined ? ROI : returnRecord.ROI,
    }, { transaction });

    await transaction.commit();
    return successResponse(res, returnRecord, 'Return updated successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('updateReturn error:', error);
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

    returnRecord.paidOn = returnRecord.month;
    returnRecord.status = "active";
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
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'IDs array is required', 400);
    }

    const returnRecords = await Return.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    if (returnRecords.length === 0) {
      return errorResponse(res, 'No return records found', 404);
    }

    const unpaidRecords = returnRecords.filter(
      (record) => !record.paidOn
    );

    if (unpaidRecords.length === 0) {
      return errorResponse(res, 'All selected returns are already paid', 400);
    }

    // Update each record using its own month as paidOn
    for (const returnRecord of unpaidRecords) {
      returnRecord.paidOn = returnRecord.month;
      returnRecord.status = 'active';

      await returnRecord.save();
    }

    return successResponse(
      res,
      unpaidRecords,
      `${unpaidRecords.length} returns marked as paid`
    );
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
  markAsPaid,updateReturn,
  generateReturnByUser,
  batchMarkAsPaid
};