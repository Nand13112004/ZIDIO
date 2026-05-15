const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const Meeting = require('../models/Meeting');
const Message = require('../models/Message');
const Summary = require('../models/Summary');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// ────────────────────────────────────────────────────────
// CREATE MEETING
// ────────────────────────────────────────────────────────

router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { title, description, scheduledAt, team } = req.body;

    if (!title) {
      const error = new Error('Meeting title is required');
      error.statusCode = 400;
      throw error;
    }

    const meeting = await Meeting.create({
      title: title.trim(),
      description: description || '',
      meetingId: uuidv4(),
      host: req.user.id,
      scheduledAt: scheduledAt || new Date(),
      team,
      participants: [
        {
          userId: req.user.id,
          name: req.user.firstName + ' ' + req.user.lastName,
          status: 'pending',
        },
      ],
    });

    logger.info(`Meeting created: ${meeting.title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: { meeting },
    });
  })
);

// ────────────────────────────────────────────────────────
// GET MEETING BY ID
// ────────────────────────────────────────────────────────

router.get(
  '/:meetingId',
  protect,
  asyncHandler(async (req, res) => {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId })
      .populate('host', 'firstName lastName avatar')
      .populate('participants.userId', 'firstName lastName avatar')
      .populate('summary');

    if (!meeting) {
      const error = new Error('Meeting not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Meeting fetched successfully',
      data: { meeting },
    });
  })
);

// ────────────────────────────────────────────────────────
// GET USER MEETINGS
// ────────────────────────────────────────────────────────

router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { status = 'completed', page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const meetings = await Meeting.find({
      $or: [
        { host: req.user.id },
        { 'participants.userId': req.user.id },
      ],
      status,
    })
      .populate('host', 'firstName lastName avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Meeting.countDocuments({
      $or: [
        { host: req.user.id },
        { 'participants.userId': req.user.id },
      ],
      status,
    });

    res.status(200).json({
      success: true,
      message: 'Meetings fetched successfully',
      data: {
        meetings,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

// ────────────────────────────────────────────────────────
// JOIN MEETING
// ────────────────────────────────────────────────────────

router.post(
  '/:meetingId/join',
  protect,
  asyncHandler(async (req, res) => {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      const error = new Error('Meeting not found');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();

    if (meeting.status === 'scheduled') {
      meeting.status = 'ongoing';
      meeting.startedAt = meeting.startedAt || now;
    }

    // Check if already a participant
    const participant = meeting.participants.find(
      (p) => p.userId?.toString() === req.user.id
    );

    if (participant) {
      participant.status = 'joined';
      participant.joinedAt = now;
      participant.leftAt = undefined;
    } else {
      meeting.participants.push({
        userId: req.user.id,
        name: req.user.firstName + ' ' + req.user.lastName,
        status: 'joined',
        joinedAt: now,
      });
    }

    await meeting.save();

    // Emit socket event
    if (req.io) {
      req.io.to(`meeting:${meetingId}`).emit('participant:joined', {
        userId: req.user.id,
        name: req.user.firstName + ' ' + req.user.lastName,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Joined meeting successfully',
      data: { meeting },
    });
  })
);

// ────────────────────────────────────────────────────────
// LEAVE MEETING
// ────────────────────────────────────────────────────────

router.post(
  '/:meetingId/leave',
  protect,
  asyncHandler(async (req, res) => {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      const error = new Error('Meeting not found');
      error.statusCode = 404;
      throw error;
    }

    // Update participant status
    const participant = meeting.participants.find(
      (p) => p.userId?.toString() === req.user.id
    );

    if (participant) {
      participant.status = 'left';
      participant.leftAt = new Date();
      participant.duration = Math.floor(
        (new Date() - participant.joinedAt) / 1000
      );
    }

    await meeting.save();

    // Emit socket event
    if (req.io) {
      req.io.to(`meeting:${meetingId}`).emit('participant:left', {
        userId: req.user.id,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Left meeting successfully',
    });
  })
);

// ────────────────────────────────────────────────────────
// END MEETING
// ────────────────────────────────────────────────────────

router.post(
  '/:meetingId/end',
  protect,
  asyncHandler(async (req, res) => {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      const error = new Error('Meeting not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user is host
    if (meeting.host.toString() !== req.user.id) {
      const error = new Error('Only meeting host can end the meeting');
      error.statusCode = 403;
      throw error;
    }

    meeting.status = 'completed';
    meeting.endedAt = new Date();

    // Mark all active participants as left
    meeting.participants.forEach((p) => {
      if (p.status === 'joined') {
        p.status = 'left';
        p.leftAt = new Date();
        if (!p.duration) {
          p.duration = Math.floor((new Date() - p.joinedAt) / 1000);
        }
      }
    });

    await meeting.save();

    logger.info(`Meeting ended: ${meeting.title}`);

    // Emit socket event
    if (req.io) {
      req.io.to(`meeting:${meetingId}`).emit('meeting:ended', {
        meetingId,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Meeting ended successfully',
      data: { meeting },
    });
  })
);

// ────────────────────────────────────────────────────────
// GET MEETING MESSAGES
// ────────────────────────────────────────────────────────

router.get(
  '/:meetingId/messages',
  protect,
  asyncHandler(async (req, res) => {
    const { meetingId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (page - 1) * limit;

    const messages = await Message.find({
      meetingId,
    })
      .populate('sender', 'firstName lastName avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Message.countDocuments({ meetingId });

    res.status(200).json({
      success: true,
      message: 'Messages fetched successfully',
      data: {
        messages: messages.reverse(),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

// ────────────────────────────────────────────────────────
// GET MEETING SUMMARY
// ────────────────────────────────────────────────────────

router.get(
  '/:meetingId/summary',
  protect,
  asyncHandler(async (req, res) => {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId }).populate('summary');

    if (!meeting) {
      const error = new Error('Meeting not found');
      error.statusCode = 404;
      throw error;
    }

    if (!meeting.summary) {
      const error = new Error('Meeting summary not yet generated');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Meeting summary fetched',
      data: { summary: meeting.summary },
    });
  })
);

// ────────────────────────────────────────────────────────
// UPDATE MEETING
// ────────────────────────────────────────────────────────

router.put(
  '/:meetingId',
  protect,
  asyncHandler(async (req, res) => {
    const { meetingId } = req.params;
    const { title, description } = req.body;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      const error = new Error('Meeting not found');
      error.statusCode = 404;
      throw error;
    }

    // Check authorization
    if (meeting.host.toString() !== req.user.id) {
      const error = new Error('Only meeting host can update the meeting');
      error.statusCode = 403;
      throw error;
    }

    if (title) meeting.title = title.trim();
    if (description) meeting.description = description;

    await meeting.save();

    res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      data: { meeting },
    });
  })
);

module.exports = router;
