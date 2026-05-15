const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
    },
    description: {
      type: String,
      default: '',
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
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
        },
        role: {
          type: String,
          enum: ['owner', 'lead', 'member'],
          default: 'member',
        },
      },
    ],
    status: {
      type: String,
      enum: ['planning', 'active', 'paused', 'completed', 'archived'],
      default: 'active',
    },
    startDate: Date,
    endDate: Date,
    icon: String,
    color: String,
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ──── INDEXES ────
projectSchema.index({ team: 1 });
projectSchema.index({ owner: 1 });

module.exports = mongoose.model('Project', projectSchema);
