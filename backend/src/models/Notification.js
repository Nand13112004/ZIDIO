const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'meeting-invite',
        'meeting-reminder',
        'meeting-started',
        'task-assigned',
        'task-completed',
        'task-due-soon',
        'mention',
        'message',
        'team-invite',
        'file-shared',
        'comment',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ['meeting', 'task', 'message', 'team', 'file'],
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    actionUrl: String,
    icon: String,
    color: {
      type: String,
      default: 'blue',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    isDismissed: {
      type: Boolean,
      default: false,
    },
    dismissedAt: Date,
    data: mongoose.Schema.Types.Mixed, // For storing additional context
    deliveryChannels: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
      },
      push: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// ──── INDEXES ────
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
