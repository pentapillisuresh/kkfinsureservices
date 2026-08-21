const { Op } = require('sequelize');
const { Offer } = require('../models');
const { Referral } = require('../models');
const { UserPoint } = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

/**
 * Create a new offer (admin only)
 */
const createOffer = async (req, res) => {
  try {
    const { title, description, rewardType, rewardValue, conditions } = req.body;

    const offer = await Offer.create({
      title,
      description,
      rewardType,
      rewardValue,
      conditions: conditions || {}
    });

    return successResponse(res, offer, 'Offer created successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update an offer (admin only)
 */
const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, rewardType, rewardValue, conditions, isActive } = req.body;

    const offer = await Offer.findByPk(id);
    if (!offer) {
      return errorResponse(res, 'Offer not found', 404);
    }

    await offer.update({
      title: title || offer.title,
      description: description || offer.description,
      rewardType: rewardType || offer.rewardType,
      rewardValue: rewardValue || offer.rewardValue,
      conditions: conditions || offer.conditions,
      isActive: isActive !== undefined ? isActive : offer.isActive
    });

    return successResponse(res, offer, 'Offer updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete an offer (admin only)
 */
const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByPk(id);
    if (!offer) {
      return errorResponse(res, 'Offer not found', 404);
    }

    // Check if any referrals use this offer
    const referralCount = await Referral.count({ where: { offerId: id } });
    if (referralCount > 0) {
      return errorResponse(res, 'Cannot delete offer as it is used in referrals. Deactivate instead.', 400);
    }

    await offer.destroy();
    return successResponse(res, null, 'Offer deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all active offers (authenticated users)
 */
const getActiveOffers = async (req, res) => {
  try {
    const offers = await Offer.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, offers, 'Active offers fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getAllOffers = async (req, res) => {
  try {

    
    const offers = await Offer.findAll({
      order: [["createdAt", "DESC"]],
    });

    return successResponse(
      res,
      offers,
      "Offers fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching offers:", error);

    return errorResponse(
      res,
      error.message || "Failed to fetch offers",
      500
    );
  }
};
/**
 * Get offer by ID (authenticated)
 */
const getOfferById = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByPk(id);
    if (!offer) {
      return errorResponse(res, 'Offer not found', 404);
    }
    return successResponse(res, offer, 'Offer fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Toggle offer active status (admin only)
 */
const toggleOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByPk(id);
    if (!offer) {
      return errorResponse(res, 'Offer not found', 404);
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    return successResponse(res, { id: offer.id, isActive: offer.isActive }, `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Apply offer to a referral (called when referral is created)
 */
const applyOfferToReferral = async (req, res) => {
  try {
    const { referrerId, referredUserId, investmentAmount } = req.body;

    // Find an active offer that matches conditions (simplified)
    // In a real implementation, we'd parse the conditions JSON to evaluate
    const offers = await Offer.findAll({
      where: { isActive: true }
    });

    let selectedOffer = null;
    for (const offer of offers) {
      const conditions = offer.conditions || {};
      // Simple condition check: if minInvestment is specified and investmentAmount >= it
      if (conditions.minInvestment && investmentAmount < conditions.minInvestment) {
        continue;
      }
      // Check expiry date if present
      if (conditions.expiryDate && new Date(conditions.expiryDate) < new Date()) {
        continue;
      }
      // For simplicity, pick the first matching offer
      selectedOffer = offer;
      break;
    }

    if (!selectedOffer) {
      return successResponse(res, null, 'No active offer applies to this referral');
    }

    // Create referral with offer details (this should be handled in referral creation)
    // This controller will be called from referralController to apply offer
    // So we return the offer to be used

    return successResponse(res, selectedOffer, 'Offer applied successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createOffer,
  updateOffer,
  deleteOffer,
  getActiveOffers,
  getOfferById,
  toggleOfferStatus,
  getAllOffers,
  applyOfferToReferral
};