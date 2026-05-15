const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [5000, 'Message must not exceed 5000 characters'],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: String,
    senderAvatar: String,
    // Either room-based or meeting-based
    roomId: {
      type: String,
      default: null,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      default: null,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    // Direct message
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    messageType: {
      type: String,
      enum: ['text', 'file', 'image', 'video', 'emoji', 'system'],
      default: 'text',
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
      },
    ],
    reactions: [
      {
        emoji: String,
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    mentionedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    editHistory: [
      {
        content: String,
        editedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    pinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: Date,
  },
  {
    timestamps: true,
  }
);

// ──── INDEXES ────
messageSchema.index({ sender: 1 });
messageSchema.index({ roomId: 1 });
messageSchema.index({ meetingId: 1 });
messageSchema.index({ teamId: 1 });
messageSchema.index({ recipientId: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
