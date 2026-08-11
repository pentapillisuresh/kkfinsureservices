const { Op } = require('sequelize');
const sequelize = require('../config/database');
const {PartnerCommission} = require('../models');
const {User} = require('../models');
const {Referral} = require('../models');
const {Investment} = require('../models');
const {PartnerTier} = require('../models');

/**
 * Process monthly commissions for all partners for a given month.
 * @param {Date} monthDate - First day of the month (e.g., new Date(2026, 6, 1))
 * @returns {Promise<number>} - Number of commissions created
 */
const processMonthlyCommissions = async (monthDate,paidOn) => {
  const transaction = await sequelize.transaction();
  try {
    const date = new Date(monthDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Get all partners (users with partnerType not 'none')
    const partners = await User.findAll({
      where: {
        partnerType: { [Op.in]: ['referral', 'authorised', 'hni'] },
        isActive: true
      },
      transaction
    });

    let processed = 0;
    for (const partner of partners) {
      // Get all referred users' active investments sum
      const referrals = await Referral.findAll({
        where: { referrerId: partner.id },
        include: [
          {
            model: User,
            as: 'referredUser',
            include: [
              {
                model: Investment,
                as: 'investments',
                where: { status: 'active' }
              }
            ]
          }
        ],
        transaction
      });

      let totalBase = 0;
      for (const ref of referrals) {
        const investments = ref.referredUser?.investments || [];
        for (const inv of investments) {
          totalBase += parseFloat(inv.amount);
        }
      }

      // Find the tier rate
      const tierDef = await PartnerTier.findOne({
        where: { name: partner.partnerType, isActive: true },
        transaction
      });
      const rate = tierDef ? parseFloat(tierDef.commissionRate) : partner.partnerCommissionRate || 0;

      const commissionAmount = (totalBase * rate) / 100;

      // Only create if amount > 0
      if (commissionAmount > 0) {
        // Check if commission already exists for this partner and month
        const existing = await PartnerCommission.findOne({
          where: {
            partnerId: partner.id,
            month: monthDate
          },
          transaction
        });

        if (!existing) {
          await PartnerCommission.create({
            partnerId: partner.id,
            month: monthDate,
            totalInvestmentBase: totalBase,
            commissionRate: rate,
            commissionAmount,
            status: 'pending'
          }, { transaction });
          processed++;
        }
      }
    }

    await transaction.commit();
    return processed;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Mark commissions as paid for a given month.
 * @param {Date} monthDate - First day of the month
 * @param {Array} partnerIds (optional) - Specific partners to mark
 * @returns {Promise<number>} - Number of commissions marked as paid
 */
const markCommissionsAsPaid = async (monthDate, partnerIds = null) => {
  const where = {
    month: monthDate,
    status: 'pending'
  };
  if (partnerIds && partnerIds.length > 0) {
    where.partnerId = { [Op.in]: partnerIds };
  }

  const [updated] = await PartnerCommission.update(
    { status: 'paid', paidOn: new Date() },
    { where }
  );

  return updated;
};

/**
 * Get total commission for a partner for a specific month.
 * @param {string} partnerId - User UUID
 * @param {Date} monthDate - First day of the month
 * @returns {Promise<number>} - Commission amount
 */
const getPartnerCommissionForMonth = async (partnerId, monthDate) => {
  const commission = await PartnerCommission.findOne({
    where: { partnerId, month: monthDate }
  });
  return commission ? parseFloat(commission.commissionAmount) : 0;
};

module.exports = {
  processMonthlyCommissions,
  markCommissionsAsPaid,
  getPartnerCommissionForMonth
};