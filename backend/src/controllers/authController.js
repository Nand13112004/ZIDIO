const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const User = require('../models/User');

// ────────────────────────────────────────────────────────
// GENERATE JWT TOKENS
// ────────────────────────────────────────────────────────

const generateAccessToken = (id, email, role) => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

const generateRefreshToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE }
  );
};

const generateTokens = (id, email, role) => {
  const accessToken = generateAccessToken(id, email, role);
  const refreshToken = generateRefreshToken(id);
  return { accessToken, refreshToken };
};

// ────────────────────────────────────────────────────────
// REGISTER
// ────────────────────────────────────────────────────────

exports.register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;

  // Validation
  if (!firstName || !lastName || !email || !password) {
    const error = new Error('Please provide all required fields');
    error.statusCode = 400;
    throw error;
  }

  if (password !== confirmPassword) {
    const error = new Error('Passwords do not match');
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 6) {
    const error = new Error('Password must be at least 6 characters');
    error.statusCode = 400;
    throw error;
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    const error = new Error('Email already registered');
    error.statusCode = 400;
    throw error;
  }

  // Create user
  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.toLowerCase().trim(),
    password,
  });

  logger.info(`New user registered: ${user.email}`);

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(
    user._id,
    user.email,
    user.role
  );

  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.getPublicProfile(),
      accessToken,
    },
  });
});

// ────────────────────────────────────────────────────────
// LOGIN
// ────────────────────────────────────────────────────────

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    const error = new Error('Please provide email and password');
    error.statusCode = 400;
    throw error;
  }

  // Find user and include password field
  const user = await User.findByEmailWithPassword(email);

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Check password
  const isPasswordMatch = await user.matchPassword(password);
  if (!isPasswordMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Check if user is active
  if (!user.isActive) {
    const error = new Error('Your account has been deactivated');
    error.statusCode = 403;
    throw error;
  }

  // Update last seen
  user.lastSeen = new Date();
  user.status = 'online';
  await user.save();

  logger.info(`User logged in: ${user.email}`);

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(
    user._id,
    user.email,
    user.role
  );

  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.getPublicProfile(),
      accessToken,
    },
  });
});

// ────────────────────────────────────────────────────────
// REFRESH TOKEN
// ────────────────────────────────────────────────────────

exports.refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    const error = new Error('No refresh token provided');
    error.statusCode = 401;
    throw error;
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      const error = new Error('Invalid refresh token or user inactive');
      error.statusCode = 401;
      throw error;
    }

    // Generate new access token
    const accessToken = generateAccessToken(user._id, user.email, user.role);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { accessToken },
    });
  } catch (error) {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }
});

// ────────────────────────────────────────────────────────
// LOGOUT
// ────────────────────────────────────────────────────────

exports.logout = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Update user status
  await User.findByIdAndUpdate(userId, { status: 'offline' });

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  logger.info(`User logged out: ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// ────────────────────────────────────────────────────────
// GET CURRENT USER
// ────────────────────────────────────────────────────────

exports.getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('teams', 'name')
    .select('-password');

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: 'Current user fetched',
    data: { user },
  });
});

// ────────────────────────────────────────────────────────
// VERIFY EMAIL (Placeholder for future email verification)
// ────────────────────────────────────────────────────────

exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // This would be implemented with email verification logic
  res.status(501).json({
    success: false,
    message: 'Email verification not yet implemented',
  });
});

// ────────────────────────────────────────────────────────
// REQUEST PASSWORD RESET (Placeholder)
// ────────────────────────────────────────────────────────

exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // This would be implemented with email reset logic
  res.status(501).json({
    success: false,
    message: 'Password reset not yet implemented',
  });
});

module.exports = {
  register: exports.register,
  login: exports.login,
  refreshToken: exports.refreshToken,
  logout: exports.logout,
  getCurrentUser: exports.getCurrentUser,
  generateTokens,
};
