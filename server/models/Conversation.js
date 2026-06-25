const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Ensure only 2 participants (DM only)
conversationSchema.path('participants').validate(function(v) {
  return v.length === 2;
}, 'A conversation must have exactly 2 participants');

// Index for fast lookup of conversations by participant
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
