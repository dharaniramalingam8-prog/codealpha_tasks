const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  searchUsers, getSuggestions, getUser,
  updateProfile, getUserPosts,
  toggleFollow, getFollowers, getFollowing,
  updateStatus, updateSettings, blockUser, reportUser,
  getBookmarks, getTrendingUsers
} = require('../controllers/userController');
const { uploadProfileImages } = require('../middleware/upload');

// Multer error handler for profile images
const handleProfileUpload = (req, res, next) => {
  uploadProfileImages.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'coverPhoto', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

router.use(authenticateToken);

// Search & Suggestions (before /:id to avoid conflict)
router.get('/search',      searchUsers);
router.get('/suggestions', getSuggestions);
router.get('/trending',    getTrendingUsers);
router.get('/bookmarks',   getBookmarks);
router.patch('/status',    updateStatus);
router.put('/settings',    updateSettings);

// User CRUD
router.get('/:id',       getUser);
router.put('/:id',       handleProfileUpload, updateProfile);
router.get('/:id/posts', getUserPosts);

// Follow
router.post('/:id/follow',    toggleFollow);
router.get('/:id/followers',  getFollowers);
router.get('/:id/following',  getFollowing);

// Moderation
router.post('/:id/block',     blockUser);
router.post('/:id/report',    reportUser);

module.exports = router;
