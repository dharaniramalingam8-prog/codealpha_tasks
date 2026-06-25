const Story = require('../models/Story');
const Follow = require('../models/Follow');

exports.uploadStory = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required for a story' });

    // req.file is already processed by multer (Cloudinary or local disk)
    const imageUrl = req.file.path || `/uploads/${req.file.filename}`;
    const imagePublicId = req.file.filename || req.file.public_id || null;

    const story = new Story({
      author: req.user.id,
      imageUrl,
      imagePublicId,
    });
    await story.save();

    await story.populate('author', 'username profilePicture avatarColor isVerified');
    
    res.status(201).json(story);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFeedStories = async (req, res) => {
  try {
    // Get IDs of users I follow from the Follow collection
    const followDocs = await Follow.find({ follower: req.user.id }).select('following').lean();
    const followingIds = followDocs.map(f => f.following);
    const targetUsers = [...followingIds, req.user.id];

    // TTL index automatically deletes stories older than 24h from DB.
    // So we just fetch all stories authored by targetUsers.
    const stories = await Story.find({ author: { $in: targetUsers } })
      .populate('author', 'username profilePicture avatarColor isVerified')
      .sort({ createdAt: 1 }); // Sort oldest to newest (for viewing order)

    // Group stories by user
    const grouped = {};
    stories.forEach(s => {
      const authorId = s.author._id.toString();
      if (!grouped[authorId]) {
        grouped[authorId] = {
          user: s.author,
          stories: []
        };
      }
      grouped[authorId].stories.push({
        _id: s._id,
        imageUrl: s.imageUrl,
        createdAt: s.createdAt,
        viewed: s.viewers.map(v => v.toString()).includes(req.user.id)
      });
    });

    // Convert object to array and sort:
    // Move current user to front, then by latest story
    const feed = Object.values(grouped);
    feed.sort((a, b) => {
      if (a.user._id.toString() === req.user.id) return -1;
      if (b.user._id.toString() === req.user.id) return 1;
      const aLatest = new Date(a.stories[a.stories.length-1].createdAt).getTime();
      const bLatest = new Date(b.stories[b.stories.length-1].createdAt).getTime();
      return bLatest - aLatest;
    });

    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markViewed = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    if (!story.viewers.map(v => v.toString()).includes(req.user.id)) {
      story.viewers.push(req.user.id);
      await story.save();
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
