const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again after 15 minutes.',
    });
  },
});

/**
 * Strict rate limiter for auth routes (signup/login)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 auth attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip} on route: ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.',
    });
  },
});

module.exports = { apiLimiter, authLimiter };
