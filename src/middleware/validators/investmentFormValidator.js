const Joi = require('joi');
const { errorResponse } = require('../responseFormatter');

const validateInvestmentForm = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().uuid().allow(null, ''),
    
    // Investor
    investorName: Joi.string().required(),
    age: Joi.number().integer().min(18).allow(null, ''),
    dateOfBirth: Joi.date().iso().allow(null, ''),
    isSeniorCitizen: Joi.boolean().default(false),
    panCardNo: Joi.string().allow(null, ''),
    investorAadhar: Joi.string().pattern(/^[0-9]{12}$/).allow(null, ''),
    investorEmail: Joi.string().email().required(),
    investorAddress: Joi.string().allow(null, ''),
    investorDocumentName: Joi.string().allow(null, ''),
    investorDocumentPath: Joi.string().allow(null, ''),
    district: Joi.string().allow(null, ''),
    state: Joi.string().allow(null, ''),
    pincode: Joi.string().allow(null, ''),

    // Bank
    bankNameBranch: Joi.string().allow(null, ''),
    accountNumber: Joi.string().allow(null, ''),
    ifscCode: Joi.string().allow(null, ''),
    investorMobile: Joi.string().pattern(/^[0-9]{10}$/).allow(null, ''),

    // Nominee
    nomineeName: Joi.string().allow(null, ''),
    nomineeRelationship: Joi.string().allow(null, ''),
    nomineePhone: Joi.string().allow(null, ''),
    nomineeAadhar: Joi.string().allow(null, ''),
    nomineeEmail: Joi.string().email().allow(null, ''),
    nomineeAddress: Joi.string().allow(null, ''),
    nomineeDocumentName: Joi.string().allow(null, ''),
    nomineeDocumentPath: Joi.string().allow(null, ''),

    // Investment
    introducerName: Joi.string().allow(null, ''),
    planId: Joi.string().uuid().required(),
    investedBy: Joi.string().allow(null, ''),
    investmentDate: Joi.date().iso().allow(null, ''),
    amount: Joi.number().positive().required(),
    paymentMode: Joi.string().allow(null, ''),
    chequeTransferDetails: Joi.string().allow(null, ''),

    // Documents
    isDisclimerCheck: Joi.boolean().default(false),
    attachedFormFile: Joi.string().allow(null, '')
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return errorResponse(res, 'Validation failed', 400, errors);
  }
  
  next();
};

module.exports = { validateInvestmentForm };