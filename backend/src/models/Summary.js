const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
    },
    title: String,
    transcript: {
      type: String,
      default: null,
    },
    summary: {
      type: String,
      default: null,
    },
    keyPoints: [String],
    actionItems: [
      {
        task: String,
        assignee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        deadline: Date,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'urgent'],
          default: 'medium',
        },
        isExtracted: {
          type: Boolean,
          default: true,
        },
      },
    ],
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        speakingTime: Number, // in seconds
        wordCount: Number,
        sentiment: {
          type: String,
          enum: ['positive', 'neutral', 'negative'],
        },
      },
    ],
    sentiment: {
      overall: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
      },
      scores: {
        positive: Number,
        neutral: Number,
        negative: Number,
      },
    },
    topics: [
      {
        name: String,
        mentions: Number,
        sentiment: String,
      },
    ],
    duration: Number, // in seconds
    wordCount: Number,
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: {
      type: String,
      enum: ['openai', 'huggingface', 'manual'],
      default: 'openai',
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: Date,
    metadata: {
      language: {
        type: String,
        default: 'en',
      },
      confidence: Number, // 0-1
      tags: [String],
    },
  },
  {
    timestamps: true,
  }
);

// ──── INDEXES ────
summarySchema.index({ meeting: 1 });
summarySchema.index({ isPublished: 1 });
summarySchema.index({ generatedAt: -1 });

module.exports = mongoose.model('Summary', summarySchema);
