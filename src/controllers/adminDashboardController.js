const { Op, Sequelize } = require('sequelize');
const {User} = require('../models');
const {Investment} = require('../models');
const {Return} = require('../models');
const {Ticket} = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

/**
 * Get admin dashboard statistics
 * Includes: user counts, active investments, total returns, pending tickets,
 * monthly new users & investments (last 6 months), investment status breakdown,
 * and recent users list.
 */
const getDashboardData = async (req, res) => {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentYear = now.getFullYear();

    // --- 1. Total Users ---
    const totalUsers = await User.count({ where: { role: 'user' } });
    const newUsersThisMonth = await User.count({
      where: {
        role: 'user',
        createdAt: { [Op.gte]: currentMonthStart }
      }
    });

    // --- 2. Active Investments ---
    const activeInvestments = await Investment.count({ where: { status: 'active' } });
    const maturedInvestments = await Investment.count({ where: { status: 'matured' } });

    // --- 3. Total Returns (this month) ---
    const totalReturnsThisMonth = await Return.sum('amount', {
      where: {
        paidOn: { [Op.gte]: currentMonthStart },
        type: 'monthly' // only monthly returns (or all, but we stick to monthly)
      }
    }) || 0;

    // --- 4. Pending Tickets ---
    const pendingTickets = await Ticket.count({
      where: { status: { [Op.in]: ['open', 'in-progress'] } }
    });

    // --- 5. Monthly Activity (last 6 months: new users & investments) ---
    // Prepare an array of the last 6 month-start dates
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

    // --- 6. Recent Users (last 10) ---
    const recentUsers = await User.findAll({
      where: { role: 'user' },
      attributes: ['id', 'fullName', 'email', 'phone', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // --- 7. Investment status breakdown (for pie/overview) ---
    const investmentStatusCounts = await Investment.findAll({
      attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('status')), 'count']],
      group: ['status']
    });

    const statusBreakdown = investmentStatusCounts.map(item => ({
      status: item.status,
      count: item.dataValues.count
    }));

    // --- 8. Additional: Total returns overall (for optional display) ---
    const totalReturnsOverall = await Return.sum('amount') || 0;

    // --- 9. Response ---
    const dashboardData = {
      stats: {
        totalUsers,
        newUsersThisMonth,
        activeInvestments,
        maturedInvestments,
        totalReturnsThisMonth,
        totalReturnsOverall,
        pendingTickets
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