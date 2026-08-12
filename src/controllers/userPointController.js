const { Op } = require('sequelize');
const {UserPoint} = require('../models');
const {User} = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

/**
 * Get authenticated user's total points
 */
const getMyPoints = async (req, res) => {
  try {
    const totalPoints = await UserPoint.sum('points', { where: { userId: req.user.id } });

    // Also get points by source
    const pointsBySource = await UserPoint.findAll({
      where: { userId: req.user.id },
      attributes: ['source', [sequelize.fn('SUM', sequelize.col('points')), 'total']],
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

/**
 * Get authenticated user's point history
 */
const getMyPointHistory = async (req, res) => {
  try {
    const { source, limit = 20, offset = 0 } = req.query;
    const where = { userId: req.user.id };
    if (source) where.source = source;

    const { count, rows } = await UserPoint.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      pointHistory: rows,
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    }, 'Point history fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get all point entries with filters
 */
const getAllPoints = async (req, res) => {
  try {
    const { userId, source, limit = 20, offset = 0 } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (source) where.source = source;

    const { count, rows } = await UserPoint.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      pointEntries: rows,
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    }, 'Point entries fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get all points for a specific user
 */
const getUserPoints = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const points = await UserPoint.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    const totalPoints = points.reduce((sum, p) => sum + p.points, 0);

    return successResponse(res, {
      totalPoints,
      points
    }, 'User points fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Add points to a user
 */
const addPoints = async (req, res) => {
  try {
    const { userId, points, source, referenceId, description, expiresAt } = req.body;

    if (!userId || !points || !source) {
      return errorResponse(res, 'userId, points, and source are required', 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const pointEntry = await UserPoint.create({
      userId,
      points,
      source,
      referenceId: referenceId || null,
      description: description || null,
      expiresAt: expiresAt || null
    });

    return successResponse(res, pointEntry, 'Points added successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateUserPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const { points, source, referenceId, description, expiresAt } = req.body;

    // 1. Find the existing point entry
    const pointEntry = await UserPoint.findByPk(id);
    if (!pointEntry) {
      return errorResponse(res, 'Point entry not found', 404);
    }

    // 2. If points are being updated, ensure it's a number (could be negative for deductions)
    if (points !== undefined && (typeof points !== 'number' || isNaN(points))) {
      return errorResponse(res, 'Points must be a valid number', 400);
    }

    // 3. Prepare update data
    const updateData = {};
    if (points !== undefined) updateData.points = points;
    if (source) updateData.source = source;
    if (referenceId !== undefined) updateData.referenceId = referenceId;
    if (description !== undefined) updateData.description = description;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    // 4. Perform update
    await pointEntry.update(updateData);

    return successResponse(res, pointEntry, 'User point updated successfully');
  } catch (error) {
    console.error('updateUserPoint error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Batch add points to multiple users
 */
const batchAddPoints = async (req, res) => {
  try {
    const { users, points, source, description } = req.body;
    if (!users || !Array.isArray(users) || users.length === 0) {
      return errorResponse(res, 'Users array is required', 400);
    }

    const entries = [];
    for (const userId of users) {
      const user = await User.findByPk(userId);
      if (user) {
        entries.push({
          userId,
          points,
          source: source || 'other',
          description: description || 'Batch points addition'
        });
      }
    }

    const created = await UserPoint.bulkCreate(entries);
    return successResponse(res, { added: created.length }, `${created.length} users received points`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Delete a point entry (if needed)
 */
const deletePointEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const pointEntry = await UserPoint.findByPk(id);
    if (!pointEntry) {
      return errorResponse(res, 'Point entry not found', 404);
    }

    await pointEntry.destroy();
    return successResponse(res, null, 'Point entry deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Expire points manually (set expiresAt)
 */
const expirePoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { expiresAt } = req.body;

    const pointEntry = await UserPoint.findByPk(id);
    if (!pointEntry) {
      return errorResponse(res, 'Point entry not found', 404);
    }

    pointEntry.expiresAt = expiresAt || new Date();
    await pointEntry.save();

    return successResponse(res, pointEntry, 'Points expiration set successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getMyPoints,
  getMyPointHistory,
  getAllPoints,
  getUserPoints,
  addPoints,
  batchAddPoints,
  updateUserPoint,
  deletePointEntry,
  expirePoints
};