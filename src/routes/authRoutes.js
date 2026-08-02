const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validator');
const authController = require('../controllers/authController');

// Public routes
router.post('/login', validate(schemas.login), authController.login);

// Admin-only routes
router.post(
  '/admin/create-user',
  authenticate,
  authorizeAdmin,
  validate(schemas.createUser),
  authController.createUser
);

// Authenticated user routes
router.put(
  '/change-password',
  authenticate,
  validate(schemas.changePassword),
  authController.changePassword
);

module.exports = router;