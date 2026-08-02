const { errorResponse } = require('./responseFormatter');

/**
 * Global error handling middleware.
 * Catches all unhandled errors and sends a structured JSON response.
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);

  // Default status and message
  let statusCode = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = 'Validation error';
    errors = err.errors.map(e => e.message);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File too large. Maximum size is 10MB.';
  }
  if (err.code === 'FILE_TYPE_NOT_ALLOWED') {
    statusCode = 400;
    message = 'File type not allowed. Only images and PDFs are accepted.';
  }

  return errorResponse(res, message, statusCode, errors);
};

module.exports = errorHandler;