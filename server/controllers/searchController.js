const User = require('../models/User');
const Post = require('../models/Post');

exports.globalSearch = async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    if (!q) return res.json({ users: [], posts: [], hashtags: [] });

    const results = {};

    // Search Users
    if (type === 'all' || type === 'users') {
      results.users = await User.find(
        { $text: { $search: q } },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .select('username profilePicture avatarColor bio isVerified')
      .limit(20);
    }

    // Search Posts
    if (type === 'all' || type === 'posts') {
      results.posts = await Post.find(
        { $text: { $search: q } },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .populate('author', 'username profilePicture avatarColor isVerified')
      .limit(20);
    }

    // Search Hashtags (Aggregating Posts to find trending tags that match the query)
    if (type === 'all' || type === 'hashtags') {
      const tagQuery = q.startsWith('#') ? q.slice(1) : q;
      const tagResults = await Post.aggregate([
        { $unwind: '$hashtags' },
        { $match: { hashtags: { $regex: tagQuery, $options: 'i' } } },
        { $group: { _id: '$hashtags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      results.hashtags = tagResults.map(t => ({ tag: t._id, count: t.count }));
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
