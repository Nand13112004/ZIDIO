const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const {
  getUserById,
  getAllUsers,
  updateProfile,
  uploadAvatar,
  updatePreferences,
  updateStatus,
  searchUsers,
  getUserStats,
  deactivateAccount,
} = require('../controllers/userController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image uploads are allowed'));
  },
});

// ────────────────────────────────────────────────────────
// PROTECTED ROUTES - All require authentication
// ────────────────────────────────────────────────────────

/**
 * @route  GET /api/users
 * @desc   Get all users (paginated)
 * @access Protected
 * @query  page, limit, search, role
 */
router.get('/', protect, getAllUsers);

/**
 * @route  GET /api/users/search
 * @desc   Search users
 * @access Protected
 * @query  query, limit
 */
router.get('/search', protect, searchUsers);

/**
 * @route  GET /api/users/:userId
 * @desc   Get user by ID
 * @access Protected
 */
router.get('/:userId', protect, getUserById);

/**
 * @route  PUT /api/users/:userId
 * @desc   Update user profile
 * @access Protected
 */
router.put('/:userId', protect, updateProfile);

/**
 * @route  PUT /api/users/:userId/avatar
 * @desc   Upload avatar to Cloudinary
 * @access Protected
 */
router.put('/:userId/avatar', protect, upload.single('avatar'), uploadAvatar);

/**
 * @route  PUT /api/users/:userId/preferences
 * @desc   Update user preferences
 * @access Protected
 */
router.put('/:userId/preferences', protect, updatePreferences);

/**
 * @route  PUT /api/users/:userId/status
 * @desc   Update user status
 * @access Protected
 */
router.put('/:userId/status', protect, updateStatus);

/**
 * @route  GET /api/users/:userId/stats
 * @desc   Get user stats
 * @access Protected
 */
router.get('/:userId/stats', protect, getUserStats);

/**
 * @route  DELETE /api/users/:userId
 * @desc   Deactivate user account
 * @access Protected
 */
router.delete('/:userId', protect, deactivateAccount);

module.exports = router;
