const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

/**
 * Protect routes - verify JWT token
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Optionally check cookies
  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    const error = new Error('Not authorized, no token provided');
    error.statusCode = 401;
    return next(error);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user info to request (full user fetch will be done in Day 2)
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    const error = new Error('Not authorized, token failed');
    error.statusCode = 401;
    return next(error);
  }
});

/**
 * Role-based authorization middleware
 * Usage: authorize('admin', 'moderator')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error(
        `Role '${req.user?.role}' is not authorized to access this route`
      );
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
};

module.exports = { protect, authorize };
