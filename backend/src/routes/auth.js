const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  register,
  login,
  googleLogin,
  googleCallback,
  refreshToken,
  logout,
  getCurrentUser,
  setPassword,
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
 * @route  GET /api/auth/google
 * @desc   Start Google OAuth2 login
 * @access Public
 */
router.get('/google', authLimiter, googleLogin);

/**
 * @route  GET /api/auth/google/callback
 * @desc   Handle Google OAuth2 callback
 * @access Public
 */
router.get('/google/callback', googleCallback);

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

/**
 * @route  POST /api/auth/set-password
 * @desc   Set password for current user (Google OAuth users)
 * @access Protected
 */
router.post('/set-password', protect, setPassword);

module.exports = router;
