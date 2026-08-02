const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.User;
const { Op, Sequelize } = require('sequelize');

const { successResponse, errorResponse } = require('../middleware/responseFormatter');

/**
 * Admin creates a new user (registration)
 */
const createUser = async (req, res) => {
  try {
    const { email, password, fullName, phone, dateOfBirth, pan, aadhar, address, isSeniorCitizen } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return errorResponse(res, 'Email already exists', 400);
    }

    const user = await User.create({
      email,
      password,
      fullName,
      phone,
      dateOfBirth,
      pan,
      aadhar,
      address,
      isSeniorCitizen: isSeniorCitizen || false,
      createdBy: req.user.id // admin who creates
    });

    // In real scenario, send password via email (implement emailService)

    return successResponse(res, {
      id: user.id,
      email: user.email,
      fullName: user.fullName
    }, 'User created successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * User login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
console.log("email::",email)
console.log("password::",password)
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials', 401);
    }
    console.log("isMatch::",isMatch)
    // Generate JWT token (3 years expiry)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '3y' }
    );
    console.log("token::",token)
    // Return user data without password
    const userData = user.toJSON();
    delete userData.password;

    return successResponse(res, {
      token,
      user: userData
    }, 'Login successful');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Change password (user only)
 */
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return errorResponse(res, 'Old password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    return successResponse(res, null, 'Password updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createUser,
  login,
  changePassword
};