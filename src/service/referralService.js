const sequelize = require('../config/database');
const {Referral} = require('../models');
const {User} = require('../models');
const {Offer} = require('../models');
const {UserPoint} = require('../models');

/**
 * Create a referral entry when a referred user invests.
 * @param {string} referrerId - UUID of referrer
 * @param {string} referredUserId - UUID of referred user
 * @param {number} investmentAmount - Amount invested
 * @param {string} offerId (optional) - Offer UUID to apply
 * @returns {Promise<Object>} - Referral object
 */
const createReferral = async (referrerId, referredUserId, investmentAmount, offerId = null) => {
  const transaction = await sequelize.transaction();
  try {
    // Check if referral already exists
    const existing = await Referral.findOne({
      where: { referrerId, referredUserId },
      transaction
    });

    if (existing) {
      throw new Error('Referral already exists');
    }

    // Determine reward type and value
    let rewardType = 'points';
    let rewardValue = '0';
    let rewardPoints = 0;

    if (offerId) {
      const offer = await Offer.findByPk(offerId, { transaction });
      if (offer && offer.isActive) {
        rewardType = offer.rewardType;
        rewardValue = offer.rewardValue;
        if (rewardType === 'points') {
          rewardPoints = parseInt(rewardValue) || 0;
        }
      }
    }

    // Default: 10 points per referral if no offer
    if (rewardPoints === 0 && rewardType === 'points') {
      rewardPoints = 10;
      rewardValue = '10';
    }

    const referral = await Referral.create({
      referrerId,
      referredUserId,
      investmentAmount,
      rewardType,
      rewardValue,
      rewardPoints,
      offerId
    }, { transaction });

    // Add points to referrer if reward type is points
    if (rewardType === 'points' && rewardPoints > 0) {
      await UserPoint.create({
        userId: referrerId,
        points: rewardPoints,
        source: 'referral',
        referenceId: referral.id,
        description: `Referral reward for referring user ${referredUserId}`
      }, { transaction });
    }

    await transaction.commit();
    return referral;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get total referral rewards for a user.
 * @param {string} userId - UUID of user
 * @returns {Promise<Object>} - Total points and count of referrals
 */
const getReferralStats = async (userId) => {
  const totalReferrals = await Referral.count({ where: { referrerId: userId } });
  const totalInvestment = await Referral.sum('investmentAmount', { where: { referrerId: userId } });
  const totalRewardPoints = await Referral.sum('rewardPoints', { where: { referrerId: userId } });

  return {
    totalReferrals,
    totalInvestment: totalInvestment || 0,
    totalRewardPoints: totalRewardPoints || 0
  };
};

module.exports = {
  createReferral,
  getReferralStats
};