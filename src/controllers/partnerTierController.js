const {PartnerTier} = require('../models');
const {User} = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

/**
 * Create a new partner tier (admin only)
 */
const createTier = async (req, res) => {
  try {
    const { name, minInvestment, maxInvestment, commissionRate } = req.body;

    // Check if tier with same name exists
    const existing = await PartnerTier.findOne({ where: { name } });
    if (existing) {
      return errorResponse(res, 'Tier with this name already exists', 400);
    }

    const tier = await PartnerTier.create({
      name,
      minInvestment,
      maxInvestment,
      commissionRate
    });

    return successResponse(res, tier, 'Partner tier created successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update a partner tier (admin only)
 */
const updateTier = async (req, res) => {
  try {
    const { id } = req.params;
    const { minInvestment, maxInvestment, commissionRate, isActive } = req.body;

    const tier = await PartnerTier.findByPk(id);
    if (!tier) {
      return errorResponse(res, 'Partner tier not found', 404);
    }

    await tier.update({
      minInvestment: minInvestment || tier.minInvestment,
      maxInvestment: maxInvestment || tier.maxInvestment,
      commissionRate: commissionRate || tier.commissionRate,
      isActive: isActive !== undefined ? isActive : tier.isActive
    });

    return successResponse(res, tier, 'Partner tier updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete a partner tier (admin only)
 */
const deleteTier = async (req, res) => {
  try {
    const { id } = req.params;
    const tier = await PartnerTier.findByPk(id);
    if (!tier) {
      return errorResponse(res, 'Partner tier not found', 404);
    }

    // Check if any user is associated with this tier? Not directly, so safe to delete.
    await tier.destroy();
    return successResponse(res, null, 'Partner tier deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all active tiers (authenticated)
 */
const getActiveTiers = async (req, res) => {
  try {
    const tiers = await PartnerTier.findAll({
      where: { isActive: true },
      order: [['minInvestment', 'ASC']]
    });

    return successResponse(res, tiers, 'Active tiers fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get tier by ID (authenticated)
 */
const getTierById = async (req, res) => {
  try {
    const { id } = req.params;
    const tier = await PartnerTier.findByPk(id);
    if (!tier) {
      return errorResponse(res, 'Partner tier not found', 404);
    }
    return successResponse(res, tier, 'Partner tier fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Toggle tier active status (admin only)
 */
const toggleTierStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const tier = await PartnerTier.findByPk(id);
    if (!tier) {
      return errorResponse(res, 'Partner tier not found', 404);
    }

    tier.isActive = !tier.isActive;
    await tier.save();

    return successResponse(res, { id: tier.id, isActive: tier.isActive }, `Tier ${tier.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Assign a partner tier to a user
 */
const assignTierToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { tierName } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const tier = await PartnerTier.findOne({ where: { name: tierName, isActive: true } });
    if (!tier) {
      return errorResponse(res, 'Active partner tier not found', 404);
    }

    // Update user's partnerType and commission rate
    user.partnerType = tierName;
    user.partnerCommissionRate = tier.commissionRate;
    await user.save();

    return successResponse(res, {
      userId: user.id,
      partnerType: user.partnerType,
      partnerCommissionRate: user.partnerCommissionRate
    }, `User assigned to ${tierName} tier successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createTier,
  updateTier,
  deleteTier,
  getActiveTiers,
  getTierById,
  toggleTierStatus,
  assignTierToUser
};