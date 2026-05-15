const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const Message = require('../models/Message');
const logger = require('../utils/logger');

// ────────────────────────────────────────────────────────
// SEND MESSAGE
// ────────────────────────────────────────────────────────

router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { content, roomId, meetingId, teamId, recipientId, messageType, attachments } =
      req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      const error = new Error('Message content or attachments are required');
      error.statusCode = 400;
      throw error;
    }

    // Validate at least one recipient type
    if (!roomId && !meetingId && !teamId && !recipientId) {
      const error = new Error('Message must be sent to a room, meeting, team, or user');
      error.statusCode = 400;
      throw error;
    }

    const message = await Message.create({
      content: content || '',
      sender: req.user.id,
      senderName: req.user.firstName + ' ' + req.user.lastName,
      senderAvatar: req.user.avatar,
      roomId,
      meetingId,
      teamId,
      recipientId,
      messageType: messageType || 'text',
      attachments: attachments || [],
    });

    await message.populate('sender', 'firstName lastName avatar');

    logger.info(`Message sent by ${req.user.email}`);

    // Emit socket event
    if (req.io) {
      if (roomId) {
        req.io.to(roomId).emit('message:new', message);
      } else if (meetingId) {
        req.io.to(`meeting:${meetingId}`).emit('message:new', message);
      } else if (teamId) {
        req.io.to(`team:${teamId}`).emit('message:new', message);
      } else if (recipientId) {
        req.io.to(recipientId).emit('message:new', message);
        req.io.to(req.user.id).emit('message:new', message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message },
    });
  })
);

// ────────────────────────────────────────────────────────
// GET MESSAGES
// ────────────────────────────────────────────────────────

router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { roomId, meetingId, teamId, recipientId, page = 1, limit = 50 } = req.query;

    const skip = (page - 1) * limit;
    const filter = { isDeleted: false };

    if (roomId) filter.roomId = roomId;
    if (meetingId) filter.meetingId = meetingId;
    if (teamId) filter.teamId = teamId;
    if (recipientId) {
      filter.$or = [
        { sender: req.user.id, recipientId },
        { sender: recipientId, recipientId: req.user.id },
      ];
    }

    const messages = await Message.find(filter)
      .populate('sender', 'firstName lastName avatar')
      .populate('mentionedUsers', 'firstName lastName')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Message.countDocuments(filter);

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
// EDIT MESSAGE
// ────────────────────────────────────────────────────────

router.put(
  '/:messageId',
  protect,
  asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) {
      const error = new Error('Message content is required');
      error.statusCode = 400;
      throw error;
    }

    const message = await Message.findById(messageId);

    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    // Check authorization
    if (message.sender.toString() !== req.user.id) {
      const error = new Error('Can only edit your own messages');
      error.statusCode = 403;
      throw error;
    }

    // Add to edit history
    message.editHistory.unshift({
      content: message.content,
      editedAt: new Date(),
    });

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    // Emit socket event
    if (req.io) {
      if (message.roomId) {
        req.io.to(message.roomId).emit('message:edited', message);
      } else if (message.meetingId) {
        req.io.to(`meeting:${message.meetingId}`).emit('message:edited', message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Message updated successfully',
      data: { message },
    });
  })
);

// ────────────────────────────────────────────────────────
// DELETE MESSAGE
// ────────────────────────────────────────────────────────

router.delete(
  '/:messageId',
  protect,
  asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    // Check authorization
    if (message.sender.toString() !== req.user.id) {
      const error = new Error('Can only delete your own messages');
      error.statusCode = 403;
      throw error;
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = '';

    await message.save();

    // Emit socket event
    if (req.io) {
      if (message.roomId) {
        req.io.to(message.roomId).emit('message:deleted', { messageId });
      } else if (message.meetingId) {
        req.io.to(`meeting:${message.meetingId}`).emit('message:deleted', { messageId });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  })
);

// ────────────────────────────────────────────────────────
// ADD REACTION TO MESSAGE
// ────────────────────────────────────────────────────────

router.post(
  '/:messageId/reactions',
  protect,
  asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      const error = new Error('Emoji is required');
      error.statusCode = 400;
      throw error;
    }

    const message = await Message.findById(messageId);

    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      (r) => r.emoji === emoji && r.userId.toString() === req.user.id
    );

    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        (r) => !(r.emoji === emoji && r.userId.toString() === req.user.id)
      );
    } else {
      // Add reaction
      message.reactions.push({
        emoji,
        userId: req.user.id,
      });
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Reaction updated',
      data: { message },
    });
  })
);

// ────────────────────────────────────────────────────────
// MARK MESSAGES AS READ
// ────────────────────────────────────────────────────────

router.post(
  '/mark-as-read',
  protect,
  asyncHandler(async (req, res) => {
    const { messageIds } = req.body;

    if (!messageIds || messageIds.length === 0) {
      const error = new Error('Message IDs are required');
      error.statusCode = 400;
      throw error;
    }

    await Message.updateMany(
      { _id: { $in: messageIds } },
      {
        $addToSet: {
          readBy: {
            userId: req.user.id,
            readAt: new Date(),
          },
        },
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  })
);

module.exports = router;
