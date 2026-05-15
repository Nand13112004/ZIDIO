const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createTeam,
  getTeam,
  getUserTeams,
  updateTeam,
  addTeamMember,
  removeTeamMember,
  deleteTeam,
} = require('../controllers/teamController');

// ────────────────────────────────────────────────────────
// PROTECTED ROUTES - All require authentication
// ────────────────────────────────────────────────────────

/**
 * @route  POST /api/teams
 * @desc   Create new team
 * @access Protected
 */
router.post('/', protect, createTeam);

/**
 * @route  GET /api/teams
 * @desc   Get all teams for current user
 * @access Protected
 */
router.get('/', protect, getUserTeams);

/**
 * @route  GET /api/teams/:teamId
 * @desc   Get team by ID
 * @access Protected
 */
router.get('/:teamId', protect, getTeam);

/**
 * @route  PUT /api/teams/:teamId
 * @desc   Update team
 * @access Protected (owner only)
 */
router.put('/:teamId', protect, updateTeam);

/**
 * @route  POST /api/teams/:teamId/members
 * @desc   Add member to team
 * @access Protected (owner/admin only)
 */
router.post('/:teamId/members', protect, addTeamMember);

/**
 * @route  DELETE /api/teams/:teamId/members/:memberId
 * @desc   Remove member from team
 * @access Protected (owner/admin only)
 */
router.delete('/:teamId/members/:memberId', protect, removeTeamMember);

/**
 * @route  DELETE /api/teams/:teamId
 * @desc   Delete team
 * @access Protected (owner only)
 */
router.delete('/:teamId', protect, deleteTeam);

module.exports = router;
