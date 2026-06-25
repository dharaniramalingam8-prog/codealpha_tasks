const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AVATAR_COLORS = ['#6C63FF','#FF6B9D','#00D2FF','#43E97B','#FA8231','#A55EEA','#FFC312','#12CBC4'];

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  bio: {
    type: String,
    default: '',
    maxlength: [200, 'Bio cannot exceed 200 characters'],
  },
  avatarColor: {
    type: String,
    default: () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  },
  website: {
    type: String,
    default: '',
  },
  // ── NEW: Profile & Cover Images ──
  profilePicture: {
    type: String,
    default: null,
  },
  profilePicturePublicId: {
    type: String,
    default: null,
  },
  coverPhoto: {
    type: String,
    default: null,
  },
  coverPhotoPublicId: {
    type: String,
    default: null,
  },
  // ── NEW: Profile Enhancements ──
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  }],
  online: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  // ── Auth Enhancements ──
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.virtual('initials').get(function() {
  return this.username.slice(0, 2).toUpperCase();
});

// ── NEW: Text Index for Global Search ──
userSchema.index({ username: 'text', bio: 'text' }, { weights: { username: 10, bio: 2 } });

module.exports = mongoose.model('User', userSchema);
