const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const logger = require('../utils/logger');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ────────────────────────────────────────────────────────
// GET USER BY ID
// ────────────────────────────────────────────────────────

exports.getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId)
    .populate('teams', 'name avatar')
    .select('-password');

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: 'User fetched successfully',
    data: { user },
  });
});

// ────────────────────────────────────────────────────────
// GET ALL USERS (Paginated)
// ────────────────────────────────────────────────────────

exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', role } = req.query;

  const skip = (page - 1) * limit;
  const filter = { isActive: true };

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (role) {
    filter.role = role;
  }

  const users = await User.find(filter)
    .select('-password')
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    message: 'Users fetched successfully',
    data: {
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// ────────────────────────────────────────────────────────
// UPDATE USER PROFILE
// ────────────────────────────────────────────────────────

exports.updateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { firstName, lastName, department, jobTitle, phoneNumber, bio, avatar } = req.body;

  // Check if user is updating their own profile or is admin
  if (req.user.id !== userId && req.user.role !== 'admin') {
    const error = new Error('Not authorized to update this profile');
    error.statusCode = 403;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Update fields
  if (firstName) user.firstName = firstName.trim();
  if (lastName) user.lastName = lastName.trim();
  if (department) user.department = department;
  if (jobTitle) user.jobTitle = jobTitle;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (bio) user.bio = bio;
  if (avatar) user.avatar = avatar;

  await user.save();

  logger.info(`User profile updated: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: user.getPublicProfile() },
  });
});

// UPLOAD AVATAR
exports.uploadAvatar = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (req.user.id !== userId && req.user.role !== 'admin') {
    const error = new Error('Not authorized to update this avatar');
    error.statusCode = 403;
    throw error;
  }

  if (!req.file) {
    const error = new Error('Avatar image file is required');
    error.statusCode = 400;
    throw error;
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    const error = new Error('Cloudinary is not configured on the server');
    error.statusCode = 503;
    throw error;
  }

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'intellmeet/avatars',
        resource_type: 'image',
        transformation: [
          { width: 360, height: 360, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(req.file.buffer);
  });

  const user = await User.findByIdAndUpdate(
    userId,
    { avatar: uploadResult.secure_url },
    { new: true }
  ).select('-password');

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  logger.info(`Avatar uploaded for: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Avatar uploaded successfully',
    data: { user },
  });
});

// ────────────────────────────────────────────────────────
// UPDATE USER PREFERENCES
// ────────────────────────────────────────────────────────

exports.updatePreferences = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { emailNotifications, pushNotifications, darkMode, language, timezone } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Update preferences
  if (emailNotifications !== undefined) user.preferences.emailNotifications = emailNotifications;
  if (pushNotifications !== undefined) user.preferences.pushNotifications = pushNotifications;
  if (darkMode !== undefined) user.preferences.darkMode = darkMode;
  if (language) user.preferences.language = language;
  if (timezone) user.preferences.timezone = timezone;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Preferences updated successfully',
    data: { preferences: user.preferences },
  });
});

// ────────────────────────────────────────────────────────
// UPDATE USER STATUS
// ────────────────────────────────────────────────────────

exports.updateStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const validStatuses = ['online', 'offline', 'idle', 'dnd'];
  if (!validStatuses.includes(status)) {
    const error = new Error('Invalid status');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { status, lastSeen: new Date() },
    { new: true }
  ).select('-password');

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Emit status update via socket.io if available
  if (req.io) {
    req.io.emit('user:status-updated', {
      userId: user._id,
      status: user.status,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Status updated successfully',
    data: { user },
  });
});

// ────────────────────────────────────────────────────────
// SEARCH USERS
// ────────────────────────────────────────────────────────

exports.searchUsers = asyncHandler(async (req, res) => {
  const { query, limit = 10 } = req.query;

  if (!query || query.length < 2) {
    const error = new Error('Search query must be at least 2 characters');
    error.statusCode = 400;
    throw error;
  }

  const users = await User.find(
    {
      isActive: true,
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    },
    { password: 0 }
  )
    .limit(parseInt(limit))
    .lean();

  res.status(200).json({
    success: true,
    message: 'Users found',
    data: { users },
  });
});

// ────────────────────────────────────────────────────────
// GET USER STATS
// ────────────────────────────────────────────────────────

exports.getUserStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('stats');

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: 'User stats fetched',
    data: { stats: user.stats },
  });
});

// ────────────────────────────────────────────────────────
// DEACTIVATE ACCOUNT
// ────────────────────────────────────────────────────────

exports.deactivateAccount = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { password } = req.body;

  // User can only deactivate their own account
  if (req.user.id !== userId) {
    const error = new Error('Can only deactivate your own account');
    error.statusCode = 403;
    throw error;
  }

  // Verify password
  const user = await User.findById(userId).select('+password');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const isPasswordMatch = await user.matchPassword(password);
  if (!isPasswordMatch) {
    const error = new Error('Password is incorrect');
    error.statusCode = 401;
    throw error;
  }

  // Deactivate account
  user.isActive = false;
  user.status = 'offline';
  await user.save();

  logger.info(`User account deactivated: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Account deactivated successfully',
  });
});

module.exports = {
  getUserById: exports.getUserById,
  getAllUsers: exports.getAllUsers,
  updateProfile: exports.updateProfile,
  uploadAvatar: exports.uploadAvatar,
  updatePreferences: exports.updatePreferences,
  updateStatus: exports.updateStatus,
  searchUsers: exports.searchUsers,
  getUserStats: exports.getUserStats,
  deactivateAccount: exports.deactivateAccount,
};
