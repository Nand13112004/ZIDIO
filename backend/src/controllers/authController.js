const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
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
    { expiresIn: process.env.JWT_EXPIRE || '1h' }
  );
};

const generateRefreshToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

const generateTokens = (id, email, role) => {
  const accessToken = generateAccessToken(id, email, role);
  const refreshToken = generateRefreshToken(id);
  return { accessToken, refreshToken };
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

const getApiBaseUrl = () =>
  (process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`)
    .trim()
    .replace(/\/+$/, '');

const getClientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');

const getGoogleRedirectUri = () =>
  process.env.GOOGLE_CALLBACK_URL || `${getApiBaseUrl()}/api/auth/google/callback`;

// ────────────────────────────────────────────────────────
// REGISTER
// ────────────────────────────────────────────────────────

exports.register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword, teamInvite, teamId } = req.body;

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

  // If there's an invite, join the team
  if (teamInvite && teamId) {
    try {
      const Team = require('../models/Team');
      const team = await Team.findById(teamId);
      if (team) {
        const invite = (team.pendingInvites || []).find((inv) => inv.token === teamInvite);
        if (invite && new Date() <= invite.expiresAt) {
          const alreadyMember = team.members.some((m) => m.userId.toString() === user._id.toString());
          if (!alreadyMember) {
            team.members.push({ userId: user._id, role: invite.role || 'member' });
            team.stats.memberCount = team.members.length;
            user.teams.push(team._id);
            await user.save();
          }
          // Consume invite
          team.pendingInvites = team.pendingInvites.filter((inv) => inv.token !== teamInvite);
          await team.save();
          logger.info(`User ${user.email} joined team ${team.name} automatically on registration`);
        }
      }
    } catch (inviteErr) {
      logger.error('Failed to automatically join team on registration:', inviteErr);
    }
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(
    user._id,
    user.email,
    user.role
  );

  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.getPublicProfile(),
      accessToken,
      refreshToken,
    },
  });
});

// ────────────────────────────────────────────────────────
// LOGIN
// ────────────────────────────────────────────────────────

exports.login = asyncHandler(async (req, res) => {
  const { email, password, teamInvite, teamId } = req.body;

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

  // If there's an invite, join the team
  if (teamInvite && teamId) {
    try {
      const Team = require('../models/Team');
      const team = await Team.findById(teamId);
      if (team) {
        const invite = (team.pendingInvites || []).find((inv) => inv.token === teamInvite);
        if (invite && new Date() <= invite.expiresAt) {
          const alreadyMember = team.members.some((m) => m.userId.toString() === user._id.toString());
          if (!alreadyMember) {
            team.members.push({ userId: user._id, role: invite.role || 'member' });
            team.stats.memberCount = team.members.length;
            if (!user.teams.includes(team._id)) {
              user.teams.push(team._id);
            }
            await user.save();
          }
          // Consume invite
          team.pendingInvites = team.pendingInvites.filter((inv) => inv.token !== teamInvite);
          await team.save();
          logger.info(`User ${user.email} joined team ${team.name} automatically on login`);
        }
      }
    } catch (inviteErr) {
      logger.error('Failed to automatically join team on login:', inviteErr);
    }
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(
    user._id,
    user.email,
    user.role
  );

  setRefreshCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.getPublicProfile(),
      accessToken,
      refreshToken,
    },
  });
});

// GOOGLE OAUTH START
exports.googleLogin = asyncHandler(async (req, res) => {
  const teamInvite = req.query.teamInvite || '';
  const teamId = req.query.teamId || '';

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    logger.warn('Google OAuth keys are missing in .env. Falling back to a simulated demo Google login.');
    const mockEmail = 'demo.google@intellmeet.com';
    let user = await User.findOne({ email: mockEmail });
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = await User.create({
        firstName: 'Google',
        lastName: 'Demo User',
        email: mockEmail,
        password: crypto.randomBytes(32).toString('hex'),
        avatar: 'https://lh3.googleusercontent.com/a/default-user',
        isVerified: true,
      });
    }
    user.lastSeen = new Date();
    user.status = 'online';
    await user.save();

    // If there's an invite, join the team
    if (teamInvite && teamId) {
      try {
        const Team = require('../models/Team');
        const team = await Team.findById(teamId);
        if (team) {
          const invite = (team.pendingInvites || []).find((inv) => inv.token === teamInvite);
          if (invite && new Date() <= invite.expiresAt) {
            const alreadyMember = team.members.some((m) => m.userId.toString() === user._id.toString());
            if (!alreadyMember) {
              team.members.push({ userId: user._id, role: invite.role || 'member' });
              team.stats.memberCount = team.members.length;
              if (!user.teams.includes(team._id)) {
                user.teams.push(team._id);
              }
              await user.save();
            }
            // Consume invite
            team.pendingInvites = team.pendingInvites.filter((inv) => inv.token !== teamInvite);
            await team.save();
            logger.info(`User ${user.email} joined team ${team.name} automatically on Google simulated login`);
          }
        }
      } catch (inviteErr) {
        logger.error('Failed to automatically join team on Google simulated login:', inviteErr);
      }
    }

    const { accessToken, refreshToken } = generateTokens(
      user._id,
      user.email,
      user.role
    );
    setRefreshCookie(res, refreshToken);

    const redirectParams = new URLSearchParams({
      accessToken,
      refreshToken,
      isNewUser: isNewUser.toString(),
    });
    if (teamId) {
      redirectParams.append('teamId', teamId);
    }

    res.redirect(`${getClientUrl()}/oauth/callback?${redirectParams.toString()}`);
    return;
  }

  const stateData = {
    csrf: crypto.randomBytes(16).toString('hex'),
    teamInvite,
    teamId,
  };
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
  
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GOOGLE OAUTH CALLBACK
exports.googleCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    const error = new Error('Google OAuth callback did not include an authorization code');
    error.statusCode = 400;
    throw error;
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const error = new Error('Google OAuth is not configured on the server');
    error.statusCode = 503;
    throw error;
  }

  let teamInvite = '';
  let teamId = '';
  if (state) {
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      teamInvite = decodedState.teamInvite || '';
      teamId = decodedState.teamId || '';
    } catch (err) {
      logger.warn('Failed to parse Google OAuth state:', err);
    }
  }

  const tokenResponse = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getGoogleRedirectUri(),
      grant_type: 'authorization_code',
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
  });

  const profile = profileResponse.data;
  const email = profile.email?.toLowerCase();

  if (!email) {
    const error = new Error('Google profile did not return an email address');
    error.statusCode = 400;
    throw error;
  }

  let user = await User.findOne({ email });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const names = (profile.name || email.split('@')[0]).split(' ');
    user = await User.create({
      firstName: profile.given_name || names[0] || 'Google',
      lastName: profile.family_name || names.slice(1).join(' ') || 'User',
      email,
      password: crypto.randomBytes(32).toString('hex'),
      avatar: profile.picture || null,
      isVerified: true,
    });
  }

  if (!user.isActive) {
    const error = new Error('Your account has been deactivated');
    error.statusCode = 403;
    throw error;
  }

  user.lastSeen = new Date();
  user.status = 'online';
  if (profile.picture && !user.avatar) {
    user.avatar = profile.picture;
  }
  await user.save();

  // If there's an invite, join the team
  if (teamInvite && teamId) {
    try {
      const Team = require('../models/Team');
      const team = await Team.findById(teamId);
      if (team) {
        const invite = (team.pendingInvites || []).find((inv) => inv.token === teamInvite);
        if (invite && new Date() <= invite.expiresAt) {
          const alreadyMember = team.members.some((m) => m.userId.toString() === user._id.toString());
          if (!alreadyMember) {
            team.members.push({ userId: user._id, role: invite.role || 'member' });
            team.stats.memberCount = team.members.length;
            if (!user.teams.includes(team._id)) {
              user.teams.push(team._id);
            }
            await user.save();
          }
          // Consume invite
          team.pendingInvites = team.pendingInvites.filter((inv) => inv.token !== teamInvite);
          await team.save();
          logger.info(`User ${user.email} joined team ${team.name} automatically on Google OAuth callback`);
        }
      }
    } catch (inviteErr) {
      logger.error('Failed to automatically join team on Google OAuth callback:', inviteErr);
    }
  }

  const { accessToken, refreshToken } = generateTokens(user._id, user.email, user.role);
  setRefreshCookie(res, refreshToken);

  const redirectParams = new URLSearchParams({
    accessToken,
    refreshToken,
    isNewUser: isNewUser.toString(),
  });
  if (teamId) {
    redirectParams.append('teamId', teamId);
  }

  logger.info(`Google OAuth login: ${user.email}`);
  res.redirect(`${getClientUrl()}/oauth/callback?${redirectParams.toString()}`);
});

// ────────────────────────────────────────────────────────
// REFRESH TOKEN
// ────────────────────────────────────────────────────────

exports.refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

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

// ────────────────────────────────────────────────────────
// SET PASSWORD (for users logged in via Google OAuth)
// ────────────────────────────────────────────────────────
exports.setPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    const error = new Error('Password must be at least 6 characters');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  user.password = password;
  await user.save();

  logger.info(`Password set for user: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Password set successfully',
  });
});

module.exports = {
  register: exports.register,
  login: exports.login,
  googleLogin: exports.googleLogin,
  googleCallback: exports.googleCallback,
  refreshToken: exports.refreshToken,
  logout: exports.logout,
  getCurrentUser: exports.getCurrentUser,
  setPassword: exports.setPassword,
  generateTokens,
};
