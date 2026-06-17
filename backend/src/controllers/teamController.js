const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Team = require('../models/Team');
const Task = require('../models/Task');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

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
  const isMember = team.members.some((m) => m.userId && m.userId._id.toString() === req.user.id);
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

// ────────────────────────────────────────────────────────
// INVITE BY EMAIL  (generates a secure token, stores in pendingInvites)
// ────────────────────────────────────────────────────────

exports.inviteByEmail = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { email, role = 'member' } = req.body;

  if (!email) {
    const error = new Error('Email is required');
    error.statusCode = 400;
    throw error;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  // Check authorization
  const userRole = team.members.find((m) => m.userId.toString() === req.user.id)?.role;
  if (!['owner', 'admin'].includes(userRole)) {
    const error = new Error('Not authorized to invite members');
    error.statusCode = 403;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // If user already exists in the system, add them directly
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const memberExists = team.members.some((m) => m.userId.toString() === existingUser._id.toString());
    if (memberExists) {
      return res.status(400).json({ success: false, message: 'User is already a team member' });
    }
    team.members.push({ userId: existingUser._id, role });
    team.stats.memberCount = team.members.length;
    await team.save();
    await User.findByIdAndUpdate(existingUser._id, { $addToSet: { teams: team._id } });
    logger.info(`Existing user ${normalizedEmail} added directly to team ${team.name}`);
    return res.status(200).json({ success: true, message: 'User added to team directly (already has an account)' });
  }

  // New user — generate a signed invite token valid for 7 days
  const inviteToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Remove any existing pending invite for this email on this team
  team.pendingInvites = (team.pendingInvites || []).filter((inv) => inv.email !== normalizedEmail);
  team.pendingInvites.push({
    email: normalizedEmail,
    token: inviteToken,
    role,
    invitedBy: req.user.id,
    expiresAt,
  });
  await team.save();

  // Build invite link — new users go to /register, existing users can use /login
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const inviteLink = `${clientUrl}/register?teamInvite=${inviteToken}&teamId=${team._id}&email=${encodeURIComponent(normalizedEmail)}`;
  const loginLink  = `${clientUrl}/login?teamInvite=${inviteToken}&teamId=${team._id}&email=${encodeURIComponent(normalizedEmail)}`;

  // Send email via nodemailer
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'nand13112004@gmail.com',
      pass: process.env.EMAIL_PASS || 'tlzg xbok gmxq ieic',
    },
  });

  const mailOptions = {
    from: `"Zidio IntellMeet" <${process.env.EMAIL_USER || 'nand13112004@gmail.com'}>`,
    to: normalizedEmail,
    subject: `You're invited to join "${team.name}" on Zidio`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#1e40af;margin-bottom:8px">Team Invitation 🎉</h2>
        <p>Hi there,</p>
        <p><strong>${req.user.firstName} ${req.user.lastName}</strong> has invited you to join the team
           <strong>${team.name}</strong> on Zidio IntellMeet.</p>
        <p style="margin:24px 0">
          <a href="${inviteLink}" style="padding:12px 24px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block">
            Accept &amp; Create Account
          </a>
        </p>
        <p style="color:#64748b;font-size:13px">Already have an account?
          <a href="${loginLink}" style="color:#2563EB">Sign in to accept the invite</a>
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">This invite expires in 7 days.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Invite email sent to ${normalizedEmail} for team ${team.name}`);
  } catch (err) {
    logger.error('Email send failed:', err);
    const emailError = new Error('Failed to send invitation email. Check email credentials.');
    emailError.statusCode = 500;
    throw emailError;
  }

  res.status(200).json({
    success: true,
    message: `Invitation email sent to ${normalizedEmail}`,
  });
});

// ────────────────────────────────────────────────────────
// ACCEPT INVITE  (called after login/register with the token)
// ────────────────────────────────────────────────────────

exports.acceptInvite = asyncHandler(async (req, res) => {
  const { token, teamId } = req.body;

  if (!token || !teamId) {
    const error = new Error('token and teamId are required');
    error.statusCode = 400;
    throw error;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  const invite = (team.pendingInvites || []).find(
    (inv) => inv.token === token
  );

  if (!invite) {
    const error = new Error('Invalid or already-used invite link');
    error.statusCode = 400;
    throw error;
  }

  if (new Date() > invite.expiresAt) {
    const error = new Error('This invite link has expired. Ask the team admin to resend it.');
    error.statusCode = 410;
    throw error;
  }

  // Verify the authenticated user's email matches the invite (optional but recommended)
  const currentUser = await User.findById(req.user.id);
  if (!currentUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Check already a member
  const alreadyMember = team.members.some((m) => m.userId.toString() === req.user.id);
  if (!alreadyMember) {
    team.members.push({ userId: req.user.id, role: invite.role || 'member' });
    team.stats.memberCount = team.members.length;
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { teams: team._id } });
  }

  // Consume the invite token
  team.pendingInvites = team.pendingInvites.filter((inv) => inv.token !== token);
  await team.save();

  logger.info(`User ${currentUser.email} accepted invite to team ${team.name}`);

  res.status(200).json({
    success: true,
    message: `Successfully joined team "${team.name}"`,
    data: { teamId: team._id, teamName: team.name },
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
  inviteByEmail: exports.inviteByEmail,
  acceptInvite: exports.acceptInvite,
};
