const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  imagePublicId: {
    type: String,
    required: true,
  },
  viewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // TTL Index: Document expires 24 hours (86400 seconds) after createdAt
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400,
  }
});

module.exports = mongoose.model('Story', storySchema);
