const User = require('../models/User');
const Post = require('../models/Post');
const Report = require('../models/Report');
const Analytics = require('../models/Analytics');

exports.getDashboardStats = async (req, res) => {
  try {
    const [userCount, postCount, reportCount] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Report.countDocuments({ status: 'pending' })
    ]);
    
    res.json({
      userCount,
      postCount,
      pendingReports: reportCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'username')
      .populate('reportedUser', 'username')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.isVerified = !user.isVerified;
    await user.save();
    
    res.json({ success: true, isVerified: user.isVerified });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
