const { Op } = require('sequelize');
const sequelize = require('../config/database');
const {Return} = require('../models');
const {Investment} = require('../models');
const {User} = require('../models');
const {Plan} = require('../models');
const { calculateMonthlyReturn, calculateAnnualBonus, isSeniorCitizen } = require('../utils/helpers');

/**
 * Generate monthly returns for all active investments for a given month.
 * @param {Date} monthDate - First day of the month (e.g., new Date(2026, 6, 1))
 * @returns {Promise<number>} - Number of returns generated
 */
const generateMonthlyReturns = async (monthDate) => {
  const transaction = await sequelize.transaction();
  try {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    // Get all active investments where maturity date > current date
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

      if (isSenior) {
        // Only generate quarterly on first month of quarter (Jan, Apr, Jul, Oct)
        if (month % 3 === 0) {
          returnType = 'quarterly_senior';
          amount = monthlyAmount * 3;
        } else {
          // Skip this month for seniors
          continue;
        }
      }

      // Check if return already exists for this investment and month
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
          paidOn: null
        }, { transaction });
        generated++;
      }
    }

    await transaction.commit();
    return generated;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Generate annual bonuses for investments that complete a year in the given year.
 * @param {number} year - e.g., 2026
 * @returns {Promise<number>} - Number of bonuses generated
 */
const generateAnnualBonuses = async (year) => {
  const transaction = await sequelize.transaction();
  try {
    const startDate = new Date(year - 1, 0, 1);
    const endDate = new Date(year - 1, 11, 31, 23, 59, 59);

    // Find investments that have investment date in the previous year
    const investments = await Investment.findAll({
      where: {
        status: 'active',
        investmentDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [{ model: Plan, as: 'plan' }],
      transaction
    });

    let generated = 0;
    const bonusMonth = new Date(year, 11, 31); // Dec 31 of current year

    for (const investment of investments) {
      const bonusAmount = calculateAnnualBonus(investment.amount, investment.plan.annualBonusPercent);

      // Check if bonus already exists for this investment in this year
      const existing = await Return.findOne({
        where: {
          investmentId: investment.id,
          type: 'annual_bonus',
          month: bonusMonth
        },
        transaction
      });

      if (!existing) {
        await Return.create({
          investmentId: investment.id,
          userId: investment.userId,
          month: bonusMonth,
          amount: bonusAmount,
          type: 'annual_bonus',
          paidOn: null
        }, { transaction });
        generated++;
      }
    }

    await transaction.commit();
    return generated;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Mark returns as paid for a given month.
 * @param {Date} monthDate - First day of the month
 * @param {Array} investmentIds (optional) - Specific investments to mark
 * @returns {Promise<number>} - Number of returns marked as paid
 */
const markReturnsAsPaid = async (monthDate, investmentIds = null) => {
  const where = {
    month: monthDate,
    paidOn: null
  };
  if (investmentIds && investmentIds.length > 0) {
    where.investmentId = { [Op.in]: investmentIds };
  }

  const [updated] = await Return.update(
    { paidOn: new Date() },
    { where }
  );

  return updated;
};

module.exports = {
  generateMonthlyReturns,
  generateAnnualBonuses,
  markReturnsAsPaid
};