const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name must not exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name must not exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    avatar: {
      type: String,
      default: null, // Cloudinary URL
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user',
    },
    department: {
      type: String,
      default: '',
    },
    jobTitle: {
      type: String,
      default: '',
    },
    phoneNumber: {
      type: String,
      default: '',
      match: [/^\+?[\d\s\-()]+$/, 'Please provide a valid phone number'],
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio must not exceed 500 characters'],
      default: '',
    },
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
      },
    ],
    status: {
      type: String,
      enum: ['online', 'offline', 'idle', 'dnd'], // Do not disturb
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      darkMode: {
        type: Boolean,
        default: false,
      },
      language: {
        type: String,
        default: 'en',
      },
      timezone: {
        type: String,
        default: 'UTC',
      },
    },
    stats: {
      totalMeetings: {
        type: Number,
        default: 0,
      },
      totalHours: {
        type: Number,
        default: 0,
      },
      messagesCount: {
        type: Number,
        default: 0,
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ──── INDEXES ────
userSchema.index({ email: 1 });
userSchema.index({ teams: 1 });

// ──── MIDDLEWARE ────

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ──── METHODS ────

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Get public profile (remove sensitive data)
userSchema.methods.getPublicProfile = function () {
  const profile = this.toObject();
  delete profile.password;
  delete profile.resetPasswordToken;
  delete profile.resetPasswordExpires;
  delete profile.verificationToken;
  return profile;
};

// ──── STATICS ────

// Find by email (include password for login)
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email }).select('+password');
};

module.exports = mongoose.model('User', userSchema);
