const { Op, Sequelize } = require('sequelize');
const {User} = require('../models');
const {Investment} = require('../models');
const {Plan} = require('../models');        // adjust if named FalconPlan
const {Return} = require('../models');
const {BalanceSheet} = require('../models');
const {Document} = require('../models');
const {Referral} = require('../models');
const {Ticket} = require('../models');
const {Offer} = require('../models');
const {UserPoint} = require('../models');
const {Nominee} = require('../models');
const {BankDetail} = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const { isSeniorCitizen, calculateMonthlyReturn } = require('../utils/helpers');

// ------------------------------------------------------------
// 1. GET PROFILE
// ------------------------------------------------------------
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Nominee, as: 'nominee' },
        { model: BankDetail, as: 'bankDetail' },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] }
      ]
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'Profile fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ------------------------------------------------------------
// 2. GET USER INVESTMENTS (Basic list)
// ------------------------------------------------------------
const getInvestments = async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    const where = { userId: req.user.id };
    if (status) where.status = status;

    const { count, rows } = await Investment.findAndCountAll({
      where,
      include: [{ model: Plan, as: 'plan' }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      investments: rows,
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    }, 'Investments fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ------------------------------------------------------------
// 3. GET DASHBOARD DATA
// ------------------------------------------------------------
const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
console.log("userId:::",userId)
    // Fetch all active investments (you can change status filter as needed)
    const investments = await Investment.findAll({
      where: { 
        userId,
        status: 'active'   // optional – include only active, or remove to get all
      },
      include: [
        { model: Plan, as: 'plan' },
        { 
          model: Return, 
          as: 'returns',
          where: { paidOn: { [Op.not]: null } }, // only paid returns
          required: false                       // left join
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    let totalInvested = 0;
    let totalPaidReturns = 0;
    let totalCurrentValue = 0;
    const investmentDetails = [];
    const monthlyReturnsMap = {};
    let lastPaymentTotal = 0;
    let lastPaymentMonth = null;

    for (const inv of investments) {
      const invAmount = parseFloat(inv.amount);
      totalInvested += invAmount;

      const paidReturns = inv.returns || [];
      const totalReturnForInv = paidReturns.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const currentValue = invAmount + totalReturnForInv;
      totalPaidReturns += totalReturnForInv;
      totalCurrentValue += currentValue;
      const profit = totalReturnForInv;

      // First payment date
      let firstPaymentDate = null;
      let firstPaymentMonth = null;
      if (paidReturns.length > 0) {
        const sorted = [...paidReturns].sort((a, b) => new Date(a.paidOn) - new Date(b.paidOn));
        firstPaymentDate = sorted[0].paidOn;
        firstPaymentMonth = new Date(firstPaymentDate).toISOString().slice(0, 7);
      }

      // Per-investment monthly returns
      const monthlyReturnsForInv = {};
      paidReturns.forEach(r => {
        const monthKey = r.paidOn.toISOString().slice(0, 7);
        monthlyReturnsForInv[monthKey] = (monthlyReturnsForInv[monthKey] || 0) + parseFloat(r.amount);
      });

      // Aggregate across all investments
      paidReturns.forEach(r => {
        const monthKey = r.paidOn.toISOString().slice(0, 7);
        monthlyReturnsMap[monthKey] = (monthlyReturnsMap[monthKey] || 0) + parseFloat(r.amount);
      });

      // Determine last payment month and total (will be re-calculated after loop)
      if (paidReturns.length > 0) {
        const sorted = [...paidReturns].sort((a, b) => new Date(b.paidOn) - new Date(a.paidOn));
        const lastPay = sorted[0];
        const monthKey = lastPay.paidOn.toISOString().slice(0, 7);
        if (!lastPaymentMonth || monthKey > lastPaymentMonth) {
          lastPaymentMonth = monthKey;
        }
      }

      // Build investment detail
      investmentDetails.push({
        id: inv.id,
        amount: inv.amount,
        planName: inv.plan ? inv.plan.name : null,
        investmentDate: inv.investmentDate,
        maturityDate: inv.maturityDate,
        currentValue: currentValue,
        totalProfit: profit,
        totalReturns: totalReturnForInv,
        returnsCount: paidReturns.length,
        firstPaymentDate: firstPaymentDate,
        firstPaymentMonth: firstPaymentMonth,
        monthlyReturns: monthlyReturnsForInv,
        isMatured: new Date(inv.maturityDate) < new Date(),
        daysToMaturity: Math.ceil((new Date(inv.maturityDate) - new Date()) / (1000 * 60 * 60 * 24)),
      });
    }

    // Compute last payment total from aggregated monthly returns
    if (lastPaymentMonth) {
      lastPaymentTotal = monthlyReturnsMap[lastPaymentMonth] || 0;
    }

    // Upcoming maturity
    const today = new Date();
    const upcomingMaturity = investments
      .filter(inv => new Date(inv.maturityDate) > today)
      .sort((a, b) => new Date(a.maturityDate) - new Date(b.maturityDate))[0];

    // Build final response
    const dashboardData = {
      summary: {
        totalInvestments: investments.length,
        totalInvested: totalInvested,
        totalPaidReturns: totalPaidReturns,
        totalCurrentValue: totalCurrentValue,
        totalProfit: totalPaidReturns,
        lastPaymentTotal: lastPaymentTotal,
        lastPaymentMonth: lastPaymentMonth,
        upcomingMaturity: upcomingMaturity ? upcomingMaturity.maturityDate : null,
        upcomingMaturityInvestmentId: upcomingMaturity ? upcomingMaturity.id : null,
      },
      monthlyReturns: Object.keys(monthlyReturnsMap)
        .sort()
        .map(month => ({
          month,
          totalAmount: monthlyReturnsMap[month]
        })),
      investments: investmentDetails,
    };

    return successResponse(res, dashboardData, 'Dashboard data fetched successfully');
  } catch (error) {
    console.error('Dashboard error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// ------------------------------------------------------------
// 4. GET BALANCE SHEET
// ------------------------------------------------------------
const getBalanceSheet = async (req, res) => {
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
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    }, 'Balance sheets fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ------------------------------------------------------------
// 5. GET DOCUMENTS
// ------------------------------------------------------------
const getDocuments = async (req, res) => {
  try {
    const { type } = req.query;
    const where = { userId: req.user.id };
    if (type) where.type = type;

    const documents = await Document.findAll({
      where,
      include: [{ model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }],
      order: [['createdAt', 'DESC']]
    });

    // Add full URL
    const docsWithUrl = documents.map(doc => ({
      ...doc.toJSON(),
      filePath: `${process.env.BASE_URL}/${doc.filePath.replace(/\\/g, '/')}`
    }));

    return successResponse(res, docsWithUrl, 'Documents fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ------------------------------------------------------------
// 6. GET RETURNS
// ------------------------------------------------------------
const getReturns = async (req, res) => {
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

// ------------------------------------------------------------
// 7. GET REFERRALS
// ------------------------------------------------------------
const getReferrals = async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const where = { referrerId: req.user.id };

    const { count, rows } = await Referral.findAndCountAll({
      where,
      include: [
        { model: User, as: 'referredUser', attributes: ['id', 'fullName', 'email'] },
        { model: Offer, as: 'offer' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      referrals: rows,
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    }, 'Referrals fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ------------------------------------------------------------
// 8. GET POINTS
// ------------------------------------------------------------
const getPoints = async (req, res) => {
  try {
    const totalPoints = await UserPoint.sum('points', { where: { userId: req.user.id } });

    const pointsBySource = await UserPoint.findAll({
      where: { userId: req.user.id },
      attributes: ['source', [Sequelize.fn('SUM', Sequelize.col('points')), 'total']],
      group: ['source']
    });

    return successResponse(res, {
      totalPoints: totalPoints || 0,
      pointsBySource
    }, 'Points fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ------------------------------------------------------------
// 9. TICKETS – Create & List
// ------------------------------------------------------------
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

const getTickets = async (req, res) => {
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

// ------------------------------------------------------------
// EXPORT ALL CONTROLLER FUNCTIONS
// ------------------------------------------------------------
module.exports = {
  getProfile,
  getInvestments,
  getDashboardData,
  getBalanceSheet,
  getDocuments,
  getReturns,
  getReferrals,
  getPoints,
  createTicket,
  getTickets,
};