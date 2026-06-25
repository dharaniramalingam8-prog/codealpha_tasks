const Notification = require('../models/Notification');

// ── GET /api/notifications ──
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username avatarColor profilePicture')
      .populate('post', 'content')
      .lean();

    res.json(notifications.map(n => ({ ...n, id: n._id })));
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/notifications/unread ──
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      read: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── PUT /api/notifications/:id/read ──
exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── PUT /api/notifications/read-all ──
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── Helper: create and emit notification ──
exports.createNotification = async ({ recipient, sender, type, post, message }) => {
  try {
    // Don't notify self
    if (recipient.toString() === sender.toString()) return null;

    const notification = await Notification.create({ recipient, sender, type, post, message });
    await notification.populate('sender', 'username avatarColor profilePicture');

    // Emit via Socket.IO
    const { emitNotification } = require('../socket');
    emitNotification(recipient.toString(), {
      ...notification.toObject(),
      id: notification._id,
    });

    return notification;
  } catch (err) {
    console.error('createNotification error:', err);
    return null;
  }
};
