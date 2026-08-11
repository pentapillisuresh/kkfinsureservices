const Joi = require('joi');
const { errorResponse } = require('./responseFormatter');

/**
 * Middleware factory to validate request against a Joi schema.
 * Supports validation of body, query, and params.
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} property - Which part of the request to validate: 'body', 'query', or 'params' (default 'body')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return errorResponse(res, 'Validation failed', 400, errors);
    }
    // Replace the validated property with the sanitized value
    req[property] = value;
    next();
  };
};

// Optionally export common schemas for reuse
const schemas = {
  // User registration/login
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    fullName: Joi.string().required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/),
    dateOfBirth: Joi.date().iso(),
    pan: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
    aadhar: Joi.string().pattern(/^[0-9]{12}$/),
    address: Joi.string(),
    referrerId: Joi.string().uuid().optional().allow(null),
    isSeniorCitizen: Joi.boolean()
  }),
  changePassword: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  }),
  // Investment
  createInvestment: Joi.object({
    userId: Joi.string().uuid().required(),
    planId: Joi.string().uuid().required(),
    amount: Joi.number().min(100000).required(),
    investmentDate: Joi.date().iso().required()
  }),
  // Partner tiers
  createPartnerTier: Joi.object({
    name: Joi.string().valid('referral', 'authorised', 'hni').required(),
    minInvestment: Joi.number().positive().required(),
    maxInvestment: Joi.number().positive().required(),
    commissionRate: Joi.number().min(0).max(100).required()
  })
};

module.exports = { validate, schemas };