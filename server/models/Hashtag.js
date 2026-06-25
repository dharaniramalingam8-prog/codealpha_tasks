const mongoose = require('mongoose');

const hashtagSchema = new mongoose.Schema({
  tag: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9_]+$/, 'Invalid hashtag format'],
  },
  count: {
    type: Number,
    default: 0,
    min: 0,
  },
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  }],
}, { timestamps: true });

// Index for trending (sort by count DESC)
hashtagSchema.index({ count: -1 });

module.exports = mongoose.model('Hashtag', hashtagSchema);
