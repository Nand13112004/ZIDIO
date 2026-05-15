const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [3, 'Team name must be at least 3 characters'],
      maxlength: [100, 'Team name must not exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description must not exceed 500 characters'],
    },
    icon: String, // Emoji or icon
    avatar: String, // Cloudinary URL
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['owner', 'admin', 'moderator', 'member'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    channels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
      },
    ],
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],
    settings: {
      isPrivate: {
        type: Boolean,
        default: false,
      },
      allowPublicInvite: {
        type: Boolean,
        default: true,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
    },
    stats: {
      memberCount: {
        type: Number,
        default: 0,
      },
      messageCount: {
        type: Number,
        default: 0,
      },
      meetingCount: {
        type: Number,
        default: 0,
      },
      taskCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// ──── INDEXES ────
teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.userId': 1 });
teamSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Team', teamSchema);
