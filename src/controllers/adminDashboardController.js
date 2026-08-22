const { Op, Sequelize } = require('sequelize');
const { User, Investment, Return, PartnerCommission, Ticket } = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

/**
 * Get admin dashboard statistics
 * Includes: user counts, investments, returns, commissions, pending tickets,
 * monthly activity, recent users, and investment breakdown.
 */
const getDashboardData = async (req, res) => {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const currentYear = now.getFullYear();

    // ---- 1. User stats ----
    const totalUsers = await User.count({ where: { role: 'user' } });
    const newUsersThisMonth = await User.count({
      where: {
        role: 'user',
        createdAt: { [Op.gte]: currentMonthStart }
      }
    });

    // ---- 2. Investment stats ----
    const activeInvestments = await Investment.count({ where: { status: 'active' } });
    const maturedInvestments = await Investment.count({ where: { status: 'matured' } });
    const totalInvestments = await Investment.count(); // all investments
    const totalInvestedAmount = await Investment.sum('amount') || 0;

    // ---- 3. Return stats ----
    // Current month pending returns (month within current month, status = 'pending')
    const pendingReturnsCurrentMonth = await Return.sum('amount', {
      where: {
        status: 'pending',
        month: { [Op.between]: [currentMonthStart, currentMonthEnd] }
      }
    }) || 0;

    // Current month paid returns (status = 'active' and paidOn within current month)
    const paidReturnsCurrentMonth = await Return.sum('amount', {
      where: {
        status: 'active',
        paidOn: { [Op.between]: [currentMonthStart, currentMonthEnd] }
      }
    }) || 0;

    // Overall pending returns (all returns with status 'pending')
    const overallPendingReturns = await Return.sum('amount', {
      where: { status: 'pending' }
    }) || 0;

    // Overall paid returns (all returns with status 'active')
    const overallPaidReturns = await Return.sum('amount', {
      where: { status: 'active' }
    }) || 0;

    // Overall returns (total) – optional, but can be used
    const totalReturnsOverall = overallPaidReturns + overallPendingReturns;

    // ---- 4. Commission stats ----
    const totalCommissionPaid = await PartnerCommission.sum('commissionAmount', {
      where: { status: 'paid' }
    }) || 0;

    // ---- 5. Pending Tickets ----
    const pendingTickets = await Ticket.count({
      where: { status: { [Op.in]: ['open', 'in-progress'] } }
    });

    // ---- 6. Monthly Activity (last 6 months) ----
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, now.getMonth() - i, 1);
      months.push(d);
    }

    const monthlyStats = await Promise.all(months.map(async (monthStart) => {
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
      const [newUsers, newInvestments] = await Promise.all([
        User.count({
          where: {
            role: 'user',
            createdAt: { [Op.between]: [monthStart, monthEnd] }
          }
        }),
        Investment.count({
          where: {
            createdAt: { [Op.between]: [monthStart, monthEnd] }
          }
        })
      ]);
      return {
        month: monthStart.toLocaleString('default', { month: 'short' }),
        newUsers,
        newInvestments
      };
    }));

    // ---- 7. Recent Users (last 10) ----
    const recentUsers = await User.findAll({
      where: { role: 'user' },
      attributes: ['id', 'fullName', 'email', 'phone', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // ---- 8. Investment status breakdown ----
    const investmentStatusCounts = await Investment.findAll({
      attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('status')), 'count']],
      group: ['status']
    });

    const statusBreakdown = investmentStatusCounts.map(item => ({
      status: item.status,
      count: item.dataValues.count
    }));

    // ---- 9. Response ----
    const dashboardData = {
      stats: {
        // Users
        totalUsers,
        newUsersThisMonth,

        // Investments
        activeInvestments,
        maturedInvestments,
        totalInvestments,
        totalInvestedAmount,

        // Returns
        pendingReturnsCurrentMonth,
        paidReturnsCurrentMonth,
        overallPendingReturns,
        overallPaidReturns,
        totalReturnsOverall, // optional

        // Commissions
        totalCommissionPaid,

        // Tickets
        pendingTickets,
      },
      monthlyActivity: monthlyStats,
      investmentOverview: statusBreakdown,
      recentUsers: recentUsers.map(u => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        isActive: u.isActive,
        joined: u.createdAt
      }))
    };

    return successResponse(res, dashboardData, 'Admin dashboard data fetched successfully');
  } catch (error) {
    console.error('Dashboard error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = { getDashboardData };