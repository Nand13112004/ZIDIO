const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Channel name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
    },
    description: String,
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    type: {
      type: String,
      enum: ['general', 'announcement', 'random', 'projects', 'custom'],
      default: 'custom',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['owner', 'moderator', 'member'],
          default: 'member',
        },
      },
    ],
    settings: {
      allowPublicMessages: {
        type: Boolean,
        default: true,
      },
      allowThreads: {
        type: Boolean,
        default: true,
      },
      allowReactions: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// ──── INDEXES ────
channelSchema.index({ team: 1 });
channelSchema.index({ name: 1 });

module.exports = mongoose.model('Channel', channelSchema);
