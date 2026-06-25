const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { emitMessage } = require('../socket');

// ── GET /api/messages/conversations ──
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username avatarColor profilePicture')
      .populate('lastMessage')
      .lean();

    // Remove self from participants list for display
    const formatted = conversations.map(conv => ({
      ...conv,
      id: conv._id,
      other: conv.participants.find(p => p._id.toString() !== req.user.id.toString()),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('getConversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/messages/conversations/:userId ── (get or create)
exports.getOrCreateConversation = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const myId = req.user.id;

    if (otherUserId === myId) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) return res.status(404).json({ error: 'User not found' });

    // Find existing conversation between these two users
    let conversation = await Conversation.findOne({
      participants: { $all: [myId, otherUserId], $size: 2 },
    })
      .populate('participants', 'username avatarColor profilePicture')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [myId, otherUserId],
      });
      await conversation.populate('participants', 'username avatarColor profilePicture');
    }

    res.json({
      ...conversation.toObject(),
      id: conversation._id,
      other: conversation.participants.find(p => p._id.toString() !== myId),
    });
  } catch (err) {
    console.error('getOrCreateConversation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/messages/conversations/:id/messages ──
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const offset = parseInt(req.query.offset) || 0;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user.id,
    });
    if (!conversation) return res.status(403).json({ error: 'Not authorized' });

    const messages = await Message.find({ conversation: id })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(30)
      .populate('sender', 'username avatarColor profilePicture')
      .lean();

    // Mark unread messages from the other user as read
    await Message.updateMany(
      { conversation: id, sender: { $ne: req.user.id }, read: false },
      { read: true }
    );

    res.json(messages.reverse().map(m => ({ ...m, id: m._id })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/messages/conversations/:id/messages ──
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user.id,
    });
    if (!conversation) return res.status(403).json({ error: 'Not authorized' });

    const message = await Message.create({
      conversation: id,
      sender: req.user.id,
      content: content.trim(),
    });

    await message.populate('sender', 'username avatarColor profilePicture');

    // Update conversation's lastMessage and lastMessageAt
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const formatted = { ...message.toObject(), id: message._id };

    // Emit to conversation room via Socket.IO
    emitMessage(id, formatted);

    res.status(201).json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/messages/unread ── (unread message count)
exports.getUnreadCount = async (req, res) => {
  try {
    // Find conversations where I'm a participant
    const myConversations = await Conversation.find({
      participants: req.user.id,
    }).select('_id');

    const convIds = myConversations.map(c => c._id);

    const count = await Message.countDocuments({
      conversation: { $in: convIds },
      sender: { $ne: req.user.id },
      read: false,
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
