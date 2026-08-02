const {BankDetail} = require('../models');
const {User} = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

// ------------------------------------------------------------
// USER – Get own bank details
// ------------------------------------------------------------
const getMyBankDetails = async (req, res) => {
  try {
    const bankDetail = await BankDetail.findOne({
      where: { userId: req.user.id }
    });
    if (!bankDetail) {
      return errorResponse(res, 'Bank details not found', 404);
    }
    return successResponse(res, bankDetail, 'Bank details fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ------------------------------------------------------------
// ADMIN – Get bank details of any user
// ------------------------------------------------------------
const getUserBankDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    const bankDetail = await BankDetail.findOne({ where: { userId } });
    if (!bankDetail) {
      return errorResponse(res, 'Bank details not found for this user', 404);
    }
    return successResponse(res, bankDetail, 'User bank details fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ------------------------------------------------------------
// ADMIN – Create or update bank details for a user
// ------------------------------------------------------------
const upsertBankDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountHolderName, bankName, accountNumber, ifscCode, branch, accountType, isVerified } = req.body;

    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Check if bank detail already exists
    let bankDetail = await BankDetail.findOne({ where: { userId } });

    if (bankDetail) {
      // Update
      await bankDetail.update({
        accountHolderName: accountHolderName || bankDetail.accountHolderName,
        bankName: bankName || bankDetail.bankName,
        accountNumber: accountNumber || bankDetail.accountNumber,
        ifscCode: ifscCode || bankDetail.ifscCode,
        branch: branch || bankDetail.branch,
        accountType: accountType || bankDetail.accountType,
        isVerified: isVerified !== undefined ? isVerified : bankDetail.isVerified
      });
      return successResponse(res, bankDetail, 'Bank details updated successfully');
    } else {
      // Create
      bankDetail = await BankDetail.create({
        userId,
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
        branch,
        accountType: accountType || 'savings',
        isVerified: isVerified || false
      });
      return successResponse(res, bankDetail, 'Bank details created successfully', 201);
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ------------------------------------------------------------
// ADMIN – Delete bank details of a user
// ------------------------------------------------------------
const deleteBankDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const bankDetail = await BankDetail.findOne({ where: { userId } });
    if (!bankDetail) {
      return errorResponse(res, 'Bank details not found for this user', 404);
    }
    await bankDetail.destroy();
    return successResponse(res, null, 'Bank details deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ------------------------------------------------------------
// ADMIN – Verify bank details (toggle isVerified)
// ------------------------------------------------------------
const verifyBankDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const bankDetail = await BankDetail.findOne({ where: { userId } });
    if (!bankDetail) {
      return errorResponse(res, 'Bank details not found', 404);
    }
    bankDetail.isVerified = !bankDetail.isVerified;
    await bankDetail.save();
    return successResponse(res, bankDetail, `Bank details ${bankDetail.isVerified ? 'verified' : 'unverified'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getMyBankDetails,
  getUserBankDetails,
  upsertBankDetails,
  deleteBankDetails,
  verifyBankDetails
};