const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
} = require('../controllers/authController');

// ────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ────────────────────────────────────────────────────────

/**
 * @route  POST /api/auth/register
 * @desc   Register new user
 * @access Public
 */
router.post('/register', authLimiter, register);

/**
 * @route  POST /api/auth/login
 * @desc   Login user
 * @access Public
 */
router.post('/login', authLimiter, login);

/**
 * @route  POST /api/auth/refresh-token
 * @desc   Refresh access token
 * @access Public (but requires valid refresh token)
 */
router.post('/refresh-token', refreshToken);

// ────────────────────────────────────────────────────────
// PROTECTED ROUTES
// ────────────────────────────────────────────────────────

/**
 * @route  GET /api/auth/me
 * @desc   Get current user
 * @access Protected
 */
router.get('/me', protect, getCurrentUser);

/**
 * @route  POST /api/auth/logout
 * @desc   Logout user
 * @access Protected
 */
router.post('/logout', protect, logout);

module.exports = router;
