const { Op } = require('sequelize');
const {BalanceSheet} = require('../models');
const {Investment} = require('../models');
const {Return} = require('../models');

/**
 * Generate a balance sheet for a user for a given period.
 * @param {string} userId - UUID of user
 * @param {Date} periodStart - Start date
 * @param {Date} periodEnd - End date
 * @returns {Promise<Object>} - BalanceSheet object
 */
const generateBalanceSheet = async (userId, periodStart, periodEnd) => {
  // Get investments within period
  const investments = await Investment.findAll({
    where: {
      userId,
      investmentDate: { [Op.between]: [periodStart, periodEnd] }
    }
  });

  const totalInvestments = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

  // Get returns within period
  const returns = await Return.findAll({
    where: {
      userId,
      month: { [Op.between]: [periodStart, periodEnd] }
    }
  });
  const totalReturns = returns.reduce((sum, ret) => sum + parseFloat(ret.amount), 0);

  const netWorth = totalInvestments + totalReturns;

  // Create or update balance sheet
  const [balanceSheet, created] = await BalanceSheet.findOrCreate({
    where: {
      userId,
      periodStart,
      periodEnd
    },
    defaults: {
      totalInvestments,
      totalReturns,
      netWorth,
      generatedAt: new Date()
    }
  });

  if (!created) {
    await balanceSheet.update({
      totalInvestments,
      totalReturns,
      netWorth,
      generatedAt: new Date()
    });
  }

  return balanceSheet;
};

/**
 * Get latest balance sheet for a user.
 * @param {string} userId - UUID of user
 * @returns {Promise<Object|null>} - BalanceSheet or null
 */
const getLatestBalanceSheet = async (userId) => {
  const balanceSheet = await BalanceSheet.findOne({
    where: { userId },
    order: [['generatedAt', 'DESC']]
  });
  return balanceSheet;
};

/**
 * Get balance sheets for a user within a date range.
 * @param {string} userId - UUID of user
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @returns {Promise<Array>} - Array of BalanceSheet objects
 */
const getBalanceSheetsForPeriod = async (userId, fromDate, toDate) => {
  const sheets = await BalanceSheet.findAll({
    where: {
      userId,
      periodStart: { [Op.gte]: fromDate },
      periodEnd: { [Op.lte]: toDate }
    },
    order: [['generatedAt', 'ASC']]
  });
  return sheets;
};

module.exports = {
  generateBalanceSheet,
  getLatestBalanceSheet,
  getBalanceSheetsForPeriod
};