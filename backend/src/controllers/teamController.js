const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Team = require('../models/Team');
const Task = require('../models/Task');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// ────────────────────────────────────────────────────────
// CREATE TEAM
// ────────────────────────────────────────────────────────

exports.createTeam = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    const error = new Error('Team name is required');
    error.statusCode = 400;
    throw error;
  }

  const team = await Team.create({
    name: name.trim(),
    description: description || '',
    owner: req.user.id,
    members: [
      {
        userId: req.user.id,
        role: 'owner',
      },
    ],
    stats: {
      memberCount: 1,
    },
  });

  // Add team to user's teams array
  await User.findByIdAndUpdate(req.user.id, {
    $push: { teams: team._id },
  });

  logger.info(`Team created: ${team.name} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Team created successfully',
    data: { team },
  });
});

// ────────────────────────────────────────────────────────
// GET TEAM BY ID
// ────────────────────────────────────────────────────────

exports.getTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  const team = await Team.findById(teamId)
    .populate('members.userId', 'firstName lastName avatar email')
    .populate('owner', 'firstName lastName avatar email');

  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if user is team member
  const isMember = team.members.some((m) => m.userId._id.toString() === req.user.id);
  if (!isMember) {
    const error = new Error('Not authorized to view this team');
    error.statusCode = 403;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: 'Team fetched successfully',
    data: { team },
  });
});

// ────────────────────────────────────────────────────────
// GET USER TEAMS
// ────────────────────────────────────────────────────────

exports.getUserTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({
    'members.userId': req.user.id,
  }).populate('owner', 'firstName lastName');

  res.status(200).json({
    success: true,
    message: 'Teams fetched successfully',
    data: { teams },
  });
});

// ────────────────────────────────────────────────────────
// UPDATE TEAM
// ────────────────────────────────────────────────────────

exports.updateTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { name, description, avatar } = req.body;

  const team = await Team.findById(teamId);

  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if user is owner
  if (team.owner.toString() !== req.user.id) {
    const error = new Error('Only team owner can update team');
    error.statusCode = 403;
    throw error;
  }

  if (name) team.name = name.trim();
  if (description) team.description = description;
  if (avatar) team.avatar = avatar;

  await team.save();

  logger.info(`Team updated: ${team.name}`);

  res.status(200).json({
    success: true,
    message: 'Team updated successfully',
    data: { team },
  });
});

// ────────────────────────────────────────────────────────
// ADD TEAM MEMBER
// ────────────────────────────────────────────────────────

exports.addTeamMember = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { userId, role = 'member' } = req.body;

  const team = await Team.findById(teamId);

  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if user is owner or admin
  const userRole = team.members.find((m) => m.userId.toString() === req.user.id)?.role;
  if (!['owner', 'admin'].includes(userRole)) {
    const error = new Error('Not authorized to add members');
    error.statusCode = 403;
    throw error;
  }

  // Check if member already exists
  const memberExists = team.members.some((m) => m.userId.toString() === userId);
  if (memberExists) {
    const error = new Error('User is already a team member');
    error.statusCode = 400;
    throw error;
  }

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Add member
  team.members.push({
    userId,
    role,
  });

  team.stats.memberCount = team.members.length;
  await team.save();

  // Add team to user's teams
  await User.findByIdAndUpdate(userId, {
    $addToSet: { teams: team._id },
  });

  logger.info(`User ${userId} added to team ${team.name}`);

  res.status(200).json({
    success: true,
    message: 'Member added successfully',
    data: { team },
  });
});

// ────────────────────────────────────────────────────────
// REMOVE TEAM MEMBER
// ────────────────────────────────────────────────────────

exports.removeTeamMember = asyncHandler(async (req, res) => {
  const { teamId, memberId } = req.params;

  const team = await Team.findById(teamId);

  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  // Check authorization
  const userRole = team.members.find((m) => m.userId.toString() === req.user.id)?.role;
  if (!['owner', 'admin'].includes(userRole)) {
    const error = new Error('Not authorized to remove members');
    error.statusCode = 403;
    throw error;
  }

  // Can't remove owner
  if (team.owner.toString() === memberId) {
    const error = new Error('Cannot remove team owner');
    error.statusCode = 400;
    throw error;
  }

  team.members = team.members.filter((m) => m.userId.toString() !== memberId);
  team.stats.memberCount = team.members.length;
  await team.save();

  // Remove team from user's teams
  await User.findByIdAndUpdate(memberId, {
    $pull: { teams: team._id },
  });

  logger.info(`User ${memberId} removed from team ${team.name}`);

  res.status(200).json({
    success: true,
    message: 'Member removed successfully',
    data: { team },
  });
});

// ────────────────────────────────────────────────────────
// DELETE TEAM
// ────────────────────────────────────────────────────────

exports.deleteTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  const team = await Team.findById(teamId);

  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if user is owner
  if (team.owner.toString() !== req.user.id) {
    const error = new Error('Only team owner can delete team');
    error.statusCode = 403;
    throw error;
  }

  // Remove team from all members
  await User.updateMany(
    { teams: team._id },
    { $pull: { teams: team._id } }
  );

  // Delete associated tasks
  await Task.deleteMany({ team: team._id });

  // Delete team
  await Team.findByIdAndDelete(teamId);

  logger.info(`Team deleted: ${team.name}`);

  res.status(200).json({
    success: true,
    message: 'Team deleted successfully',
  });
});

module.exports = {
  createTeam: exports.createTeam,
  getTeam: exports.getTeam,
  getUserTeams: exports.getUserTeams,
  updateTeam: exports.updateTeam,
  addTeamMember: exports.addTeamMember,
  removeTeamMember: exports.removeTeamMember,
  deleteTeam: exports.deleteTeam,
};
