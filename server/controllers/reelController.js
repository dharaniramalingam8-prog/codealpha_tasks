const Reel = require('../models/Reel');
const uploadModule = require('../middleware/upload');

exports.getReels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Fetch reels randomly or based on latest
    const reels = await Reel.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username avatarColor profilePicture')
      .populate('comments.author', 'username avatarColor profilePicture')
      .lean();

    const formatted = reels.map(r => ({
      ...r,
      id: r._id,
      userLiked: req.user ? r.likes.some(id => id.toString() === req.user.id.toString()) : false,
      likes: undefined
    }));

    res.json(formatted);
  } catch (err) {
    console.error('getReels error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.uploadReel = async (req, res) => {
  try {
    const { caption } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    const videoUrl = uploadModule.isCloud ? req.file.path : `/uploads/${req.file.filename}`;
    const videoPublicId = uploadModule.isCloud ? req.file.filename : req.file.filename;

    const reel = await Reel.create({
      author: req.user.id,
      caption: caption ? caption.trim() : '',
      videoUrl,
      videoPublicId
    });

    await reel.populate('author', 'username avatarColor profilePicture');

    res.status(201).json({ ...reel.toObject(), id: reel._id });
  } catch (err) {
    console.error('uploadReel error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });

    const index = reel.likes.indexOf(req.user.id);
    let liked = false;

    if (index === -1) {
      reel.likes.push(req.user.id);
      liked = true;
    } else {
      reel.likes.splice(index, 1);
    }

    await reel.save();
    res.json({ liked, likeCount: reel.likes.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Comment empty' });

    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });

    reel.comments.push({
      author: req.user.id,
      content: content.trim()
    });

    await reel.save();
    
    // Return the newly added comment populated
    await reel.populate('comments.author', 'username avatarColor profilePicture');
    const newComment = reel.comments[reel.comments.length - 1];

    res.json({ comment: newComment, commentCount: reel.comments.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.shareReel = async (req, res) => {
  try {
    const reel = await Reel.findByIdAndUpdate(req.params.id, { $inc: { shareCount: 1 } }, { new: true });
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    res.json({ shareCount: reel.shareCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
