const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title must not exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description must not exceed 500 characters'],
    },
    meetingId: {
      type: String,
      required: true,
      unique: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        name: String,
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        leftAt: Date,
        duration: Number, // in seconds
        status: {
          type: String,
          enum: ['joined', 'left', 'pending'],
          default: 'pending',
        },
      },
    ],
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    scheduledAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: Date,
    endedAt: Date,
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    type: {
      type: String,
      enum: ['one-on-one', 'group', 'team-meeting'],
      default: 'group',
    },
    isRecording: {
      type: Boolean,
      default: false,
    },
    recordingUrl: String,
    recordingDuration: Number, // in seconds
    transcript: {
      type: String,
      default: null,
    },
    summary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Summary',
    },
    settings: {
      allowScreenShare: {
        type: Boolean,
        default: true,
      },
      allowChat: {
        type: Boolean,
        default: true,
      },
      allowRecording: {
        type: Boolean,
        default: true,
      },
      maxParticipants: {
        type: Number,
        default: 100,
      },
      requirePassword: {
        type: Boolean,
        default: false,
      },
      password: String,
    },
    metadata: {
      topic: String,
      tags: [String],
      customFields: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// ──── INDEXES ────
meetingSchema.index({ meetingId: 1 });
meetingSchema.index({ host: 1 });
meetingSchema.index({ team: 1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ createdAt: -1 });

// ──── METHODS ────

// Get meeting duration
meetingSchema.methods.getDuration = function () {
  if (this.startedAt && this.endedAt) {
    return Math.floor((this.endedAt - this.startedAt) / 1000); // in seconds
  }
  return 0;
};

// Get active participants
meetingSchema.methods.getActiveParticipants = function () {
  return this.participants.filter((p) => p.status === 'joined');
};

// Get total participants
meetingSchema.methods.getTotalParticipants = function () {
  return this.participants.length;
};

module.exports = mongoose.model('Meeting', meetingSchema);
