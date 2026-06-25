const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminOnly = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    // Attach full user for downstream if needed
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

module.exports = adminOnly;
