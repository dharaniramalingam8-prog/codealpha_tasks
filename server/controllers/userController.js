const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Report = require('../models/Report'); // NEW
const { createNotification } = require('./notificationController');
const { deleteImage } = require('../middleware/upload');

// Helper: get user with social stats
const getUserStats = async (userId, currentUserId) => {
  const [user, postCount, followerCount, followingCount, isFollowingDoc] = await Promise.all([
    User.findById(userId).lean(),
    Post.countDocuments({ author: userId }),
    Follow.countDocuments({ following: userId }),
    Follow.countDocuments({ follower: userId }),
    currentUserId && currentUserId.toString() !== userId.toString()
      ? Follow.findOne({ follower: currentUserId, following: userId })
      : null,
  ]);

  if (!user) return null;

  const { password, __v, ...safeUser } = user;
  return {
    ...safeUser,
    id: user._id,
    postCount,
    followerCount,
    followingCount,
    isFollowing: !!isFollowingDoc,
  };
};

// ── GET /api/users/search?q= ──
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);

    const users = await User.find({
      username: { $regex: q.trim(), $options: 'i' },
      _id: { $ne: req.user.id },
    })
      .select('username bio avatarColor profilePicture')
      .limit(10)
      .lean();

    res.json(users.map(u => ({ ...u, id: u._id })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/users/suggestions ──
exports.getSuggestions = async (req, res) => {
  try {
    const following = await Follow.find({ follower: req.user.id }).select('following');
    const followingIds = following.map(f => f.following);
    followingIds.push(req.user.id);

    const users = await User.aggregate([
      { $match: { _id: { $nin: followingIds } } },
      { $sample: { size: 5 } },
      { $project: { username: 1, bio: 1, avatarColor: 1, profilePicture: 1 } },
    ]);

    res.json(users.map(u => ({ ...u, id: u._id })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/users/:id ──
exports.getUser = async (req, res) => {
  try {
    const user = await getUserStats(req.params.id, req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    if (err.kind === 'ObjectId') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Server error' });
  }
};

// ── PUT /api/users/:id ── (multipart/form-data)
exports.updateProfile = async (req, res) => {
  try {
    if (req.params.id !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { bio, avatarColor, website, username } = req.body;
    const updates = {};

    if (bio !== undefined) updates.bio = bio;
    if (avatarColor) updates.avatarColor = avatarColor;
    if (website !== undefined) updates.website = website;

    // Username change
    if (username && username.trim() !== '') {
      // Check uniqueness
      const existing = await User.findOne({ username: username.trim(), _id: { $ne: req.params.id } });
      if (existing) return res.status(409).json({ error: 'Username already taken' });
      updates.username = username.trim();
    }

    const uploadModule = require('../middleware/upload');
    const currentUser = await User.findById(req.params.id);

    // Handle profile picture upload
    if (req.files?.profilePicture?.[0]) {
      const file = req.files.profilePicture[0];
      if (currentUser.profilePicturePublicId) {
        await deleteImage(currentUser.profilePicturePublicId);
      }
      updates.profilePicture = uploadModule.isCloud ? file.path : `/uploads/${file.filename}`;
      updates.profilePicturePublicId = file.filename;
    }

    // Handle cover photo upload
    if (req.files?.coverPhoto?.[0]) {
      const file = req.files.coverPhoto[0];
      if (currentUser.coverPhotoPublicId) {
        await deleteImage(currentUser.coverPhotoPublicId);
      }
      updates.coverPhoto = uploadModule.isCloud ? file.path : `/uploads/${file.filename}`;
      updates.coverPhotoPublicId = file.filename;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    const result = await getUserStats(user._id, req.user.id);
    res.json(result);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Username already taken' });
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join('. ');
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/users/:id/posts ──
exports.getUserPosts = async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;

    const posts = await Post.find({ author: req.params.id })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(12)
      .populate('author', 'username avatarColor profilePicture')
      .lean();

    const formatted = posts.map(p => ({
      ...p,
      id: p._id,
      likeCount: p.likes.length,
      userLiked: p.likes.some(id => id.toString() === req.user.id.toString()),
      likes: undefined,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/users/:id/follow ── (toggle)
exports.toggleFollow = async (req, res) => {
  try {
    const followingId = req.params.id;
    const followerId = req.user.id;

    if (followerId.toString() === followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(followingId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const existing = await Follow.findOne({ follower: followerId, following: followingId });

    if (existing) {
      await Follow.deleteOne({ _id: existing._id });
      return res.json({ following: false });
    } else {
      await Follow.create({ follower: followerId, following: followingId });

      // Send follow notification
      createNotification({
        recipient: followingId,
        sender: followerId,
        type: 'follow',
        message: 'started following you',
      });

      return res.json({ following: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/users/:id/followers ──
exports.getFollowers = async (req, res) => {
  try {
    const docs = await Follow.find({ following: req.params.id })
      .populate('follower', 'username bio avatarColor profilePicture')
      .lean();

    res.json(docs.map(d => ({ ...d.follower, id: d.follower._id })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/users/:id/following ──
exports.getFollowing = async (req, res) => {
  try {
    const docs = await Follow.find({ follower: req.params.id })
      .populate('following', 'username bio avatarColor profilePicture')
      .lean();

    res.json(docs.map(d => ({ ...d.following, id: d.following._id })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── PATCH /api/users/status ──
exports.updateStatus = async (req, res) => {
  try {
    const { online } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { online },
      { new: true }
    );
    res.json({ success: true, online: user.online });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/users/:id/block ──
exports.blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const targetId = req.params.id;

    if (user.blockedUsers.includes(targetId)) {
      user.blockedUsers.pull(targetId);
      await user.save();
      return res.json({ blocked: false });
    } else {
      user.blockedUsers.addToSet(targetId);
      await user.save();
      return res.json({ blocked: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/users/:id/report ──
exports.reportUser = async (req, res) => {
  try {
    const { reason, type } = req.body;
    const report = new Report({
      reporter: req.user.id,
      reportedUser: req.params.id,
      reason,
      type
    });
    await report.save();
    res.status(201).json({ message: 'User reported successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'bookmarks',
      populate: { path: 'author', select: 'username profilePicture avatarColor isVerified' }
    });
    // Return posts formatted correctly (checking if post exists and user has liked/saved it)
    const savedPosts = user.bookmarks.filter(p => p !== null).map(post => {
      const p = post.toObject();
      p.userLiked = p.likes.some(id => id.toString() === req.user.id);
      p.userSaved = true; // since it's in bookmarks
      return p;
    });
    // Sort latest saved first
    savedPosts.reverse();
    res.json(savedPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTrendingUsers = async (req, res) => {
  try {
    // Aggregate from the Follow collection to count followers per user
    const trending = await Follow.aggregate([
      { $group: { _id: '$following', followerCount: { $sum: 1 } } },
      { $sort: { followerCount: -1 } },
      { $limit: 10 }
    ]);

    // Populate user details
    const userIds = trending.map(t => t._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('username profilePicture avatarColor bio isVerified')
      .lean();

    // Merge follower counts
    const result = trending.map(t => {
      const user = users.find(u => u._id.toString() === t._id.toString());
      return user ? { ...user, id: user._id, followerCount: t.followerCount } : null;
    }).filter(Boolean);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PUT /api/users/settings ──
exports.updateSettings = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findById(req.user.id);
    
    if (email) user.email = email;
    if (password) user.password = password; // pre-save hook handles hashing
    
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
