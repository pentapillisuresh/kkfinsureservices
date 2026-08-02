const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const {User} = require('../models');
const {Investment} = require('../models');
const {Plan} = require('../models');
const {Document} = require('../models');
const {BalanceSheet} = require('../models');
const {Return} = require('../models');
const {Referral} = require('../models');
const {Ticket} = require('../models');
const { formatDate, calculateMaturityDate } = require('../utils/helpers');

/**
 * Get all users with pagination and filters
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, partnerType, isActive } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }
    if (role) where.role = role;
    if (partnerType) where.partnerType = partnerType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
        { model: Nominee, as: 'nominee' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, {
      users: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    }, 'Users fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get user details by ID
 */
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Nominee, as: 'nominee' },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
        { model: Investment, as: 'investments' }
      ]
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'User details fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update user details (admin only)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, dateOfBirth, pan, aadhar, address, nomineeId, isSeniorCitizen, partnerType, partnerCommissionRate, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Update allowed fields
    await user.update({
      fullName: fullName || user.fullName,
      phone: phone || user.phone,
      dateOfBirth: dateOfBirth || user.dateOfBirth,
      pan: pan || user.pan,
      aadhar: aadhar || user.aadhar,
      address: address || user.address,
      nomineeId: nomineeId || user.nomineeId,
      isSeniorCitizen: isSeniorCitizen !== undefined ? isSeniorCitizen : user.isSeniorCitizen,
      partnerType: partnerType || user.partnerType,
      partnerCommissionRate: partnerCommissionRate !== undefined ? partnerCommissionRate : user.partnerCommissionRate,
      isActive: isActive !== undefined ? isActive : user.isActive
    });

    return successResponse(res, { id: user.id }, 'User updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Toggle user active status
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    user.isActive = !user.isActive;
    await user.save();

    return successResponse(res, { id: user.id, isActive: user.isActive }, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Dashboard stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.count({ where: { role: 'user' } });
    const activeInvestments = await Investment.count({ where: { status: 'active' } });
    const totalInvestmentAmount = await Investment.sum('amount', { where: { status: 'active' } });
    const pendingTickets = await Ticket.count({ where: { status: 'open' } });

    // Monthly stats (current month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const newUsersThisMonth = await User.count({
      where: {
        role: 'user',
        createdAt: { [Op.between]: [monthStart, monthEnd] }
      }
    });

    const returnsThisMonth = await Return.sum('amount', {
      where: {
        month: { [Op.between]: [monthStart, monthEnd] }
      }
    });

    return successResponse(res, {
      totalUsers,
      activeInvestments,
      totalInvestmentAmount: totalInvestmentAmount || 0,
      pendingTickets,
      newUsersThisMonth,
      returnsThisMonth: returnsThisMonth || 0
    }, 'Dashboard stats fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Approve DPC check for an investment
 */
const approveDPC = async (req, res) => {
  try {
    const { id } = req.params;
    const investment = await Investment.findByPk(id);
    if (!investment) {
      return errorResponse(res, 'Investment not found', 404);
    }

    investment.dpcCheck = true;
    await investment.save();

    return successResponse(res, { id: investment.id, dpcCheck: true }, 'DPC approved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Upload company document
 */
const uploadCompanyDocument = async (req, res) => {
  try {
    const { title, type } = req.body;
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    const document = await Document.create({
      userId: null, // company document
      type: type || 'company',
      title,
      filePath: req.file.path,
      uploadedBy: req.user.id
    });

    const fullUrl = `${process.env.BASE_URL}/${document.filePath.replace(/\\/g, '/')}`;
    return successResponse(res, { ...document.toJSON(), filePath: fullUrl }, 'Company document uploaded successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get company documents
 */
const getCompanyDocuments = async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { userId: null, type: 'company' },
      include: [{ model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }],
      order: [['createdAt', 'DESC']]
    });

    // Add full URL
    const docsWithUrl = documents.map(doc => ({
      ...doc.toJSON(),
      filePath: `${process.env.BASE_URL}/${doc.filePath.replace(/\\/g, '/')}`
    }));

    return successResponse(res, docsWithUrl, 'Company documents fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete company document
 */
const deleteCompanyDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findOne({ where: { id, userId: null, type: 'company' } });
    if (!doc) {
      return errorResponse(res, 'Document not found', 404);
    }

    // Optionally delete file from filesystem
    const fs = require('fs');
    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    await doc.destroy();
    return successResponse(res, null, 'Company document deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Generate balance sheet for a user (admin)
 */
const generateBalanceSheet = async (req, res) => {
  try {
    const { userId, periodStart, periodEnd } = req.body;
    if (!userId || !periodStart || !periodEnd) {
      return errorResponse(res, 'userId, periodStart, and periodEnd are required', 400);
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Validate user
    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Get investments within period
    const investments = await Investment.findAll({
      where: {
        userId,
        investmentDate: { [Op.between]: [start, end] }
      }
    });

    const totalInvestments = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    // Get returns within period
    const returns = await Return.findAll({
      where: {
        userId,
        month: { [Op.between]: [start, end] }
      }
    });
    const totalReturns = returns.reduce((sum, ret) => sum + parseFloat(ret.amount), 0);

    const netWorth = totalInvestments + totalReturns;

    // Create balance sheet entry
    const balanceSheet = await BalanceSheet.create({
      userId,
      periodStart: start,
      periodEnd: end,
      totalInvestments,
      totalReturns,
      netWorth,
      generatedAt: new Date()
    });

    return successResponse(res, balanceSheet, 'Balance sheet generated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get audit logs (placeholder)
 */
const getAuditLogs = async (req, res) => {
  // This could be implemented with a dedicated logs table
  return successResponse(res, [], 'Audit logs feature coming soon');
};

module.exports = {
  getAllUsers,
  getUserDetails,
  updateUser,
  toggleUserStatus,
  getDashboardStats,
  approveDPC,
  uploadCompanyDocument,
  getCompanyDocuments,
  deleteCompanyDocument,
  generateBalanceSheet,
  getAuditLogs
};