const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { createNotification } = require('./notificationController');

// ── GET /api/posts/:id/comments ──
exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: 1 })
      .populate('author', 'username avatarColor profilePicture')
      .lean();

    res.json(comments.map(c => ({ ...c, id: c._id })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/posts/:id/comments ──
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = await Comment.create({
      post: req.params.id,
      author: req.user.id,
      content: content.trim(),
    });

    await comment.populate('author', 'username avatarColor profilePicture');

    // Notify post author
    createNotification({
      recipient: post.author,
      sender: req.user.id,
      type: 'comment',
      post: post._id,
      message: 'commented on your post',
    });

    res.status(201).json({ ...comment.toObject(), id: comment._id });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join('. ');
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// ── PUT /api/posts/:id/comments/:commentId ── (NEW: edit comment)
exports.updateComment = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.author.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    comment.content = content.trim();
    comment.edited = true;
    await comment.save();

    await comment.populate('author', 'username avatarColor profilePicture');

    res.json({ ...comment.toObject(), id: comment._id });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join('. ');
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// ── DELETE /api/posts/:id/comments/:commentId ──
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.author.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Comment.deleteOne({ _id: comment._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
