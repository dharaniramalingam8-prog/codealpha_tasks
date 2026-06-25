const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  content: {
    type: String,
    trim: true,
    maxlength: [500, 'Post cannot exceed 500 characters'],
    default: '',
  },
  imageUrl: {
    type: String,
    default: null,
  },
  // ── NEW: Cloudinary public_id for deletion ──
  imagePublicId: {
    type: String,
    default: null,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  edited: {
    type: Boolean,
    default: false,
  },
  // ── NEW: Extracted hashtags ──
  hashtags: [{
    type: String,
    lowercase: true,
    trim: true,
  }],
  // ── NEW: Post Enhancements ──
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // ── NEW: Polls ──
  poll: {
    question: String,
    options: [{
      text: String,
      votes: { type: Number, default: 0 },
      voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }]
  },
  shareCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });  // for hashtag feed queries

// ── NEW: Text Index for Global Search ──
postSchema.index({ content: 'text' });

module.exports = mongoose.model('Post', postSchema);
