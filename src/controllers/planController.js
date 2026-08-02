const {Plan} = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const { DEFAULTS } = require('../utils/constants');

/**
 * Create a new plan (admin only)
 */
const createPlan = async (req, res) => {
  try {
    const { name,planType, minInvestment, maxInvestment, maturityPeriod, monthlyReturnPercent, annualBonusPercent } = req.body;

    // Validate ranges
    if (minInvestment < DEFAULTS.MIN_INVESTMENT) {
      return errorResponse(res, `Minimum investment must be at least ${DEFAULTS.MIN_INVESTMENT}`, 400);
    }
    if (monthlyReturnPercent < DEFAULTS.MONTHLY_RETURN_MIN || monthlyReturnPercent > DEFAULTS.MONTHLY_RETURN_MAX) {
      return errorResponse(res, `Monthly return must be between ${DEFAULTS.MONTHLY_RETURN_MIN}% and ${DEFAULTS.MONTHLY_RETURN_MAX}%`, 400);
    }

    const plan = await Plan.create({
      name,planType,
      minInvestment,
      maxInvestment,
      maturityPeriod,
      monthlyReturnPercent,
      annualBonusPercent: annualBonusPercent || DEFAULTS.ANNUAL_BONUS_PERCENT
    });

    return successResponse(res, plan, 'plan created successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all plans (authenticated)
 */
const getAllPlans = async (req, res) => {
  try {
    const { isActive } = req.query;
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const plans = await Plan.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, plans, 'plans fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get a plan by ID (authenticated)
 */
const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findByPk(id);
    if (!plan) {
      return errorResponse(res, 'plan not found', 404);
    }
    return successResponse(res, plan, 'plan fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update a plan (admin only)
 */
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, minInvestment, maxInvestment, maturityPeriod, monthlyReturnPercent, annualBonusPercent } = req.body;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return errorResponse(res, 'plan not found', 404);
    }

    if (minInvestment && minInvestment < DEFAULTS.MIN_INVESTMENT) {
      return errorResponse(res, `Minimum investment must be at least ${DEFAULTS.MIN_INVESTMENT}`, 400);
    }
    if (monthlyReturnPercent && (monthlyReturnPercent < DEFAULTS.MONTHLY_RETURN_MIN || monthlyReturnPercent > DEFAULTS.MONTHLY_RETURN_MAX)) {
      return errorResponse(res, `Monthly return must be between ${DEFAULTS.MONTHLY_RETURN_MIN}% and ${DEFAULTS.MONTHLY_RETURN_MAX}%`, 400);
    }

    await plan.update({
      name: name || plan.name,
      minInvestment: minInvestment || plan.minInvestment,
      maxInvestment: maxInvestment || plan.maxInvestment,
      maturityPeriod: maturityPeriod || plan.maturityPeriod,
      monthlyReturnPercent: monthlyReturnPercent || plan.monthlyReturnPercent,
      annualBonusPercent: annualBonusPercent || plan.annualBonusPercent
    });

    return successResponse(res, plan, 'plan updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Toggle plan active status (admin only)
 */
const togglePlanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findByPk(id);
    if (!plan) {
      return errorResponse(res, 'plan not found', 404);
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    return successResponse(res, { id: plan.id, isActive: plan.isActive }, `Plan ${plan.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete a plan (admin only) - soft delete? We'll just hard delete if no investments linked.
 */
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findByPk(id);
    if (!plan) {
      return errorResponse(res, 'plan not found', 404);
    }

    // Check if any investments exist for this plan
    const investmentCount = await Investment.count({ where: { planId: id } });
    if (investmentCount > 0) {
      return errorResponse(res, 'Cannot delete plan with existing investments. Deactivate instead.', 400);
    }

    await plan.destroy();
    return successResponse(res, null, 'plan deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  togglePlanStatus,
  deletePlan
};