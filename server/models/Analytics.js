const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true, // Only one record per day
  },
  newUsers: {
    type: Number,
    default: 0,
  },
  activeUsers: {
    type: Number,
    default: 0,
  },
  postsCreated: {
    type: Number,
    default: 0,
  },
  engagement: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
  }
}, { timestamps: true });

module.exports = mongoose.model('Analytics', analyticsSchema);
