/**
 * Standard success response
 * @param {Object} res - Express response object
 * @param {*} data - Data to send in response
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default 200)
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Standard error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {*} errors - Additional error details (optional)
 */
const errorResponse = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};

module.exports = { successResponse, errorResponse };