const { Op } = require('sequelize');
const {Referral} = require('../models');
const {User} = require('../models');
const {UserPoint} = require('../models');
const {Offer} = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

/**
 * Create a referral (when referred user invests)
 */
const createReferral = async (req, res) => {
  try {
    const { referrerId, referredUserId, investmentAmount, rewardType, rewardValue } = req.body;

    // Validate users
    const referrer = await User.findByPk(referrerId);
    if (!referrer) {
      return errorResponse(res, 'Referrer not found', 404);
    }

    const referredUser = await User.findByPk(referredUserId);
    if (!referredUser) {
      return errorResponse(res, 'Referred user not found', 404);
    }

    // Check if referral already exists
    const existing = await Referral.findOne({
      where: { referrerId, referredUserId }
    });
    if (existing) {
      return errorResponse(res, 'Referral already exists', 400);
    }

    // Find applicable offer
    let offer = null;
    const offers = await Offer.findAll({ where: { isActive: true } });
    for (const o of offers) {
      const conditions = o.conditions || {};
      if (conditions.minInvestment && investmentAmount < conditions.minInvestment) continue;
      if (conditions.expiryDate && new Date(conditions.expiryDate) < new Date()) continue;
      offer = o;
      break;
    }

    let finalRewardType = rewardType || 'points';
    let finalRewardValue = rewardValue || Math.floor(investmentAmount / 1000); // default points

    if (offer) {
      finalRewardType = offer.rewardType;
      finalRewardValue = offer.rewardValue;
    }

    const referral = await Referral.create({
      referrerId,
      referredUserId,
      investmentAmount,
      rewardType: finalRewardType,
      rewardValue: finalRewardValue,
      offerId: offer ? offer.id : null
    });

    // Award points if rewardType is points
    let pointsEarned = 0;
    if (finalRewardType === 'points') {
      pointsEarned = parseInt(finalRewardValue);
      await UserPoint.create({
        userId: referrerId,
        points: pointsEarned,
        source: 'referral',
        referenceId: referral.id,
        description: `Referral reward for investment of ₹${investmentAmount}`
      });
    }

    // If rewardType is cashback or voucher, we'd handle elsewhere

    // Update referral rewardPoints
    referral.rewardPoints = pointsEarned;
    await referral.save();

    return successResponse(res, {
      referral,
      pointsEarned
    }, 'Referral created successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get authenticated user's referrals
 */
const getMyReferrals = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = { referrerId: req.user.id };

    const offset = (page - 1) * limit;

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
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    }, 'Referrals fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get referral statistics for authenticated user
 */
const getMyReferralStats = async (req, res) => {
  try {
    const totalReferrals = await Referral.count({ where: { referrerId: req.user.id } });
    const totalInvestment = await Referral.sum('investmentAmount', { where: { referrerId: req.user.id } });
    const totalPoints = await Referral.sum('rewardPoints', { where: { referrerId: req.user.id } });

    return successResponse(res, {
      totalReferrals,
      totalInvestment: totalInvestment || 0,
      totalPoints: totalPoints || 0
    }, 'Referral stats fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get all referrals
 */
const getAllReferrals = async (req, res) => {
  try {
    const { referrerId, referredUserId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (referrerId) where.referrerId = referrerId;
    if (referredUserId) where.referredUserId = referredUserId;

    const offset = (page - 1) * limit;

    const { count, rows } = await Referral.findAndCountAll({
      where,
      include: [
        { model: User, as: 'referrer', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'referredUser', attributes: ['id', 'fullName', 'email'] },
        { model: Offer, as: 'offer' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, {
      referrals: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    }, 'Referrals fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get referral by ID
 */
const getReferralDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const referral = await Referral.findByPk(id, {
      include: [
        { model: User, as: 'referrer', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'referredUser', attributes: ['id', 'fullName', 'email'] },
        { model: Offer, as: 'offer' }
      ]
    });

    if (!referral) {
      return errorResponse(res, 'Referral not found', 404);
    }

    return successResponse(res, referral, 'Referral details fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Update referral reward (if needed)
 */
const updateReferralReward = async (req, res) => {
  try {
    const { id } = req.params;
    const { rewardType, rewardValue, rewardPoints } = req.body;

    const referral = await Referral.findByPk(id);
    if (!referral) {
      return errorResponse(res, 'Referral not found', 404);
    }

    await referral.update({
      rewardType: rewardType || referral.rewardType,
      rewardValue: rewardValue || referral.rewardValue,
      rewardPoints: rewardPoints !== undefined ? rewardPoints : referral.rewardPoints
    });

    return successResponse(res, referral, 'Referral reward updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Delete a referral
 */
const deleteReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const referral = await Referral.findByPk(id);
    if (!referral) {
      return errorResponse(res, 'Referral not found', 404);
    }

    await referral.destroy();
    return successResponse(res, null, 'Referral deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get referrals for a specific user
 */
const getUserReferrals = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const referrals = await Referral.findAll({
      where: { referrerId: userId },
      include: [
        { model: User, as: 'referredUser', attributes: ['id', 'fullName', 'email'] },
        { model: Offer, as: 'offer' }
      ],
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, referrals, 'User referrals fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createReferral,
  getMyReferrals,
  getMyReferralStats,
  getAllReferrals,
  getReferralDetails,
  updateReferralReward,
  deleteReferral,
  getUserReferrals
};