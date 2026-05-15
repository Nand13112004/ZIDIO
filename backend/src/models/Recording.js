const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileSize: Number, // in bytes
    duration: Number, // in seconds
    resolution: {
      type: String,
      enum: ['360p', '480p', '720p', '1080p', '2k', '4k'],
      default: '720p',
    },
    frameRate: {
      type: Number,
      default: 30,
    },
    codec: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    storage: {
      type: String,
      enum: ['cloudinary', 'aws-s3', 'azure', 'local'],
      default: 'cloudinary',
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    visibility: {
      type: String,
      enum: ['private', 'team', 'public'],
      default: 'private',
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    accessLog: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        accessedAt: {
          type: Date,
          default: Date.now,
        },
        duration: Number, // How long they watched
      },
    ],
    metadata: {
      title: String,
      description: String,
      tags: [String],
    },
  },
  {
    timestamps: true,
  }
);

// ──── INDEXES ────
recordingSchema.index({ meeting: 1 });
recordingSchema.index({ uploadedAt: -1 });
recordingSchema.index({ isPublished: 1 });

module.exports = mongoose.model('Recording', recordingSchema);
