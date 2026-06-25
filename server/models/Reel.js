const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  caption: {
    type: String,
    trim: true,
    maxlength: [200, 'Caption cannot exceed 200 characters'],
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required'],
  },
  videoPublicId: {
    type: String,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  shareCount: {
    type: Number,
    default: 0,
  },
  viewCount: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

reelSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

reelSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

module.exports = mongoose.model('Reel', reelSchema);
