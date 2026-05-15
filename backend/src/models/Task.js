const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [2000, 'Description must not exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      default: null,
    },
    dueDate: Date,
    completedAt: Date,
    estimatedTime: Number, // in hours
    actualTime: Number, // in hours
    subtasks: [
      {
        title: String,
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
      },
    ],
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    tags: [String],
    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        content: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    watchers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    activityLog: [
      {
        action: String,
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        changes: mongoose.Schema.Types.Mixed,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ──── INDEXES ────
taskSchema.index({ assignee: 1 });
taskSchema.index({ reporter: 1 });
taskSchema.index({ team: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });

// ──── METHODS ────

// Check if task is overdue
taskSchema.methods.isOverdue = function () {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'done';
};

// Get progress percentage
taskSchema.methods.getProgress = function () {
  if (this.subtasks.length === 0) return this.status === 'done' ? 100 : 0;
  const completedSubtasks = this.subtasks.filter((st) => st.completed).length;
  return Math.round((completedSubtasks / this.subtasks.length) * 100);
};

module.exports = mongoose.model('Task', taskSchema);
