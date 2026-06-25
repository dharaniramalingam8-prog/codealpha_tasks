const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const User = require('../models/User'); // NEW
const { createNotification } = require('./notificationController');
const { syncHashtags, removePostHashtags } = require('./hashtagController');
const { deleteImage } = require('../middleware/upload');

const LIMIT = 15;

// Helper to build image URL for local uploads
const getImageUrl = (file, isCloud) => {
  if (!file) return null;
  if (isCloud) return file.path; // Cloudinary URL
  return `/uploads/${file.filename}`; // local path
};

// Helper: format post for response
const formatPost = (post, currentUserId) => {
  const p = post.toObject ? post.toObject() : post;
  return {
    ...p,
    id: p._id,
    likeCount: p.likes ? p.likes.length : 0,
    userLiked: p.likes ? p.likes.some(id => id.toString() === currentUserId.toString()) : false,
    likes: undefined,
  };
};

// ── GET /api/posts/feed ──
exports.getFeed = async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.user.id;

    const following = await Follow.find({ follower: userId }).select('following');
    const ids = following.map(f => f.following);
    ids.push(userId);

    const posts = await Post.find({ author: { $in: ids } })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(LIMIT)
      .populate('author', 'username avatarColor profilePicture')
      .lean();

    const postIds = posts.map(p => p._id);
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: '$post', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    commentCounts.forEach(c => { countMap[c._id.toString()] = c.count; });

    const formatted = posts.map(p => ({
      ...p,
      id: p._id,
      likeCount: p.likes.length,
      commentCount: countMap[p._id.toString()] || 0,
      userLiked: p.likes.some(id => id.toString() === userId.toString()),
      userSaved: p.savedBy && p.savedBy.some(id => id.toString() === userId.toString()),
      likes: undefined,
      savedBy: undefined,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('getFeed error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/posts/explore ──
exports.getExplore = async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.user.id;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(LIMIT)
      .populate('author', 'username avatarColor profilePicture')
      .lean();

    const postIds = posts.map(p => p._id);
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: '$post', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    commentCounts.forEach(c => { countMap[c._id.toString()] = c.count; });

    const formatted = posts.map(p => ({
      ...p,
      id: p._id,
      likeCount: p.likes.length,
      commentCount: countMap[p._id.toString()] || 0,
      userLiked: p.likes.some(id => id.toString() === userId.toString()),
      userSaved: p.savedBy && p.savedBy.some(id => id.toString() === userId.toString()),
      likes: undefined,
      savedBy: undefined,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/posts/:id ──
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username avatarColor profilePicture')
      .lean();

    if (!post) return res.status(404).json({ error: 'Post not found' });

    const commentCount = await Comment.countDocuments({ post: post._id });
    const userId = req.user.id;

    res.json({
      ...post,
      id: post._id,
      likeCount: post.likes.length,
      commentCount,
      userLiked: post.likes.some(id => id.toString() === userId.toString()),
      userSaved: post.savedBy && post.savedBy.some(id => id.toString() === userId.toString()),
      likes: undefined,
      savedBy: undefined,
    });
  } catch (err) {
    if (err.kind === 'ObjectId') return res.status(404).json({ error: 'Post not found' });
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/posts ── (multipart/form-data)
exports.createPost = async (req, res) => {
  try {
    const { content } = req.body;

    if ((!content || content.trim().length === 0) && !req.file) {
      return res.status(400).json({ error: 'Post must contain either text or an image' });
    }

    const uploadModule = require('../middleware/upload');
    let imageUrl = null;
    let imagePublicId = null;

    if (req.file) {
      imageUrl = uploadModule.isCloud ? req.file.path : `/uploads/${req.file.filename}`;
      imagePublicId = uploadModule.isCloud ? req.file.filename : req.file.filename;
    }

    // Extract hashtags
    const hashtags = await syncHashtags(content.trim(), null);

    // Handle Polls
    let poll = undefined;
    if (req.body.pollQuestion && req.body.pollOptions) {
      try {
        const options = JSON.parse(req.body.pollOptions);
        if (Array.isArray(options) && options.length >= 2) {
          poll = {
            question: req.body.pollQuestion.trim(),
            options: options.map(opt => ({ text: opt.trim(), votes: 0, voters: [] }))
          };
        }
      } catch (e) {
        console.error('Invalid poll options JSON');
      }
    }

    const post = await Post.create({
      author: req.user.id,
      content: content.trim(),
      imageUrl,
      imagePublicId,
      hashtags,
      poll,
    });

    // Now sync hashtags with the real post ID
    if (hashtags.length > 0) {
      await syncHashtags(content.trim(), post._id, []);
    }

    await post.populate('author', 'username avatarColor profilePicture');

    res.status(201).json({
      ...post.toObject(),
      id: post._id,
      likeCount: 0,
      commentCount: 0,
      userLiked: false,
      likes: undefined,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join('. ');
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// ── PUT /api/posts/:id ──
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { content, imageUrl: urlFromBody } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content cannot be empty' });
    }

    // Handle new image upload
    const uploadModule = require('../middleware/upload');
    if (req.file) {
      // Delete old image from Cloudinary
      if (post.imagePublicId) await deleteImage(post.imagePublicId);
      post.imageUrl = uploadModule.isCloud ? req.file.path : `/uploads/${req.file.filename}`;
      post.imagePublicId = req.file.filename;
    } else if (urlFromBody === '' || urlFromBody === null) {
      // Explicitly clearing image
      if (post.imagePublicId) await deleteImage(post.imagePublicId);
      post.imageUrl = null;
      post.imagePublicId = null;
    }

    // Sync hashtags
    const newHashtags = await syncHashtags(content.trim(), post._id, post.hashtags || []);

    post.content = content.trim();
    post.hashtags = newHashtags;
    post.edited = true;
    await post.save();

    await post.populate('author', 'username avatarColor profilePicture');
    const commentCount = await Comment.countDocuments({ post: post._id });

    res.json({
      ...post.toObject(),
      id: post._id,
      likeCount: post.likes.length,
      commentCount,
      userLiked: post.likes.some(id => id.toString() === req.user.id.toString()),
      likes: undefined,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join('. ');
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// ── DELETE /api/posts/:id ──
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Clean up
    await Promise.all([
      Post.deleteOne({ _id: post._id }),
      Comment.deleteMany({ post: post._id }),
      post.imagePublicId ? deleteImage(post.imagePublicId) : Promise.resolve(),
      removePostHashtags(post._id, post.hashtags || []),
    ]);

    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/posts/:id/like ── (toggle)
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const userId = req.user.id;
    const alreadyLiked = post.likes.some(id => id.toString() === userId.toString());

    if (alreadyLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.addToSet(userId);
      // Notify post author
      createNotification({
        recipient: post.author,
        sender: userId,
        type: 'like',
        post: post._id,
        message: 'liked your post',
      });
    }

    await post.save();

    res.json({
      liked: !alreadyLiked,
      likeCount: post.likes.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/posts/:id/save ── (toggle)
exports.toggleSave = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const user = await User.findById(req.user.id);
    const userId = req.user.id;

    const alreadySaved = post.savedBy.some(id => id.toString() === userId.toString());

    if (alreadySaved) {
      post.savedBy.pull(userId);
      user.bookmarks.pull(post._id);
    } else {
      post.savedBy.addToSet(userId);
      user.bookmarks.addToSet(post._id);
    }

    await Promise.all([post.save(), user.save()]);

    res.json({
      saved: !alreadySaved,
      saveCount: post.savedBy.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/posts/:id/share ──
exports.sharePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { shareCount: 1 } }, { new: true });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ shareCount: post.shareCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/posts/:id/vote ──
exports.votePoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post || !post.poll || !post.poll.options) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Check if user already voted
    let alreadyVoted = false;
    post.poll.options.forEach(opt => {
      if (opt.voters.map(v => v.toString()).includes(req.user.id.toString())) {
        alreadyVoted = true;
      }
    });

    if (alreadyVoted) {
      return res.status(400).json({ error: 'You have already voted on this poll' });
    }

    if (optionIndex < 0 || optionIndex >= post.poll.options.length) {
      return res.status(400).json({ error: 'Invalid poll option' });
    }

    post.poll.options[optionIndex].votes += 1;
    post.poll.options[optionIndex].voters.push(req.user.id);
    await post.save();

    res.json({ poll: post.poll });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getTrendingPosts = async (req, res) => {
  try {
    // Trending based on likes count
    const posts = await Post.aggregate([
      { $addFields: { likeCount: { $size: "$likes" } } },
      { $sort: { likeCount: -1, createdAt: -1 } },
      { $limit: 10 }
    ]);

    // Populate authors
    await Post.populate(posts, { path: 'author', select: 'username profilePicture avatarColor isVerified' });

    // Add userLiked and userSaved fields for the current user
    const formattedPosts = posts.map(post => {
      post.userLiked = post.likes.some(id => id.toString() === req.user.id);
      post.userSaved = post.savedBy.some(id => id.toString() === req.user.id);
      return post;
    });

    res.json(formattedPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
