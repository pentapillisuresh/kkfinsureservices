const { Op } = require('sequelize');
const sequelize = require('../config/database');
const InvestmentForm = require('../models/InvestmentForm');
const User = require('../models/User');
const Plan = require('../models/Plan');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

/**
 * Create a new Investment Form
 */
const createForm = async (req, res) => {
  try {
    const formData = req.body;

    // 1. Auto-link to existing user if userId is not provided
    if (!formData.userId) {
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: formData.investorEmail },
            formData.panCardNo ? { pan: formData.panCardNo } : null,
            formData.investorMobile ? { phone: formData.investorMobile } : null
          ].filter(Boolean) // remove nulls if PAN/Mobile not provided
        }
      });
      if (existingUser) {
        formData.userId = existingUser.id;
      }
    }

    // 2. Validate if plan exists
    const plan = await Plan.findByPk(formData.planId);
    if (!plan) {
      return errorResponse(res, 'Invalid Plan ID provided', 400);
    }

    // 3. Create the form
    const newForm = await InvestmentForm.create(formData);

    return successResponse(res, newForm, 'Investment form submitted successfully', 201);
  } catch (error) {
    console.error('Create Form Error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all Investment Forms (Admin view with pagination & search)
 */
const getAllForms = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, planId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    // Filter by plan
    if (planId) {
      whereClause.planId = planId;
    }

    // Search by Name, Email, PAN, or Mobile
    if (search) {
      whereClause[Op.or] = [
        { investorName: { [Op.like]: `%${search}%` } },
        { investorEmail: { [Op.like]: `%${search}%` } },
        { panCardNo: { [Op.like]: `%${search}%` } },
        { investorMobile: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await InvestmentForm.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: Plan, as: 'plan', attributes: ['id', 'name', 'planType'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, {
      forms: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    }, 'Forms fetched successfully');
  } catch (error) {
    console.error('Get All Forms Error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get a single Investment Form by ID
 */
const getFormById = async (req, res) => {
  try {
    const form = await InvestmentForm.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: Plan, as: 'plan' }
      ]
    });

    if (!form) {
      return errorResponse(res, 'Investment form not found', 404);
    }

    return successResponse(res, form, 'Form fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update an Investment Form
 */
const updateForm = async (req, res) => {
  try {
    const form = await InvestmentForm.findByPk(req.params.id);
    if (!form) {
      return errorResponse(res, 'Investment form not found', 404);
    }

    // Update the form with new data
    await form.update(req.body);

    return successResponse(res, form, 'Investment form updated successfully');
  } catch (error) {
    console.error('Update Form Error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete an Investment Form
 */
const deleteForm = async (req, res) => {
  try {
    const form = await InvestmentForm.findByPk(req.params.id);
    if (!form) {
      return errorResponse(res, 'Investment form not found', 404);
    }

    await form.destroy();
    return successResponse(res, null, 'Investment form deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Upload/Update Investment Form Documents & DPC Check
 * (Helper endpoint specifically for updating paths and status)
 */
const updateFormDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      attachedFormFile, 
      investorDocumentPath, 
      nomineeDocumentPath, 
      isDisclimerCheck 
    } = req.body;

    const form = await InvestmentForm.findByPk(id);
    if (!form) {
      return errorResponse(res, 'Investment form not found', 404);
    }

    await form.update({
      attachedFormFile: attachedFormFile !== undefined ? attachedFormFile : form.attachedFormFile,
      investorDocumentPath: investorDocumentPath !== undefined ? investorDocumentPath : form.investorDocumentPath,
      nomineeDocumentPath: nomineeDocumentPath !== undefined ? nomineeDocumentPath : form.nomineeDocumentPath,
      isDisclimerCheck: isDisclimerCheck !== undefined ? isDisclimerCheck : form.isDisclimerCheck,
    });

    return successResponse(res, form, 'Form documents updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createForm,
  getAllForms,
  getFormById,
  updateForm,
  deleteForm,
  updateFormDocuments
};