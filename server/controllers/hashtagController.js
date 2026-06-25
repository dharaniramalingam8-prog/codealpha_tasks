const Hashtag = require('../models/Hashtag');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// ── GET /api/hashtags/trending ──
exports.getTrending = async (req, res) => {
  try {
    const trending = await Hashtag.find({ count: { $gt: 0 } })
      .sort({ count: -1 })
      .limit(10)
      .select('tag count')
      .lean();

    res.json(trending.map(h => ({ ...h, id: h._id })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/hashtags/:tag ── (hashtag feed)
exports.getHashtagFeed = async (req, res) => {
  try {
    const tag = req.params.tag.toLowerCase().replace(/^#/, '');
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.user.id;

    const posts = await Post.find({ hashtags: tag })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(15)
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
      likes: undefined,
    }));

    // Get hashtag info
    const hashtagDoc = await Hashtag.findOne({ tag }).select('tag count').lean();

    res.json({
      tag,
      postCount: hashtagDoc?.count || posts.length,
      posts: formatted,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── Helper: extract and update hashtags from post content ──
exports.syncHashtags = async (content, postId, oldHashtags = []) => {
  try {
    const newTags = extractHashtags(content);

    // Tags to remove (were in old post but not in new)
    const toRemove = oldHashtags.filter(t => !newTags.includes(t));
    // Tags to add (in new post but not in old)
    const toAdd = newTags.filter(t => !oldHashtags.includes(t));

    // Decrement removed tags
    for (const tag of toRemove) {
      await Hashtag.findOneAndUpdate(
        { tag },
        { $pull: { posts: postId }, $inc: { count: -1 } }
      );
    }

    // Add/increment new tags
    for (const tag of toAdd) {
      await Hashtag.findOneAndUpdate(
        { tag },
        { $addToSet: { posts: postId }, $inc: { count: 1 } },
        { upsert: true }
      );
    }

    return newTags;
  } catch (err) {
    console.error('syncHashtags error:', err);
    return [];
  }
};

// ── Helper: remove all hashtag references for a post ──
exports.removePostHashtags = async (postId, hashtags = []) => {
  try {
    for (const tag of hashtags) {
      await Hashtag.findOneAndUpdate(
        { tag },
        { $pull: { posts: postId }, $inc: { count: -1 } }
      );
    }
  } catch (err) {
    console.error('removePostHashtags error:', err);
  }
};

function extractHashtags(content) {
  const matches = content.match(/#[a-zA-Z0-9_]+/g) || [];
  return [...new Set(matches.map(h => h.slice(1).toLowerCase()))];
}
