const jwt = require('jsonwebtoken');
const { errorResponse } = require('./responseFormatter');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return errorResponse(res, 'Access denied. No token provided.', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token.', 401);
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return errorResponse(res, 'Admin access required.', 403);
  }
  next();
};

module.exports = { authenticate, authorizeAdmin };