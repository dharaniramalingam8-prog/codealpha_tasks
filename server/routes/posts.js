const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getFeed, getExplore, getPost,
  createPost, updatePost, deletePost, toggleLike,
  toggleSave, sharePost, getTrendingPosts, votePoll
} = require('../controllers/postController');
const {
  getComments, addComment, updateComment, deleteComment,
} = require('../controllers/commentController');
const { uploadPostImage } = require('../middleware/upload');

// Multer error handler
const handleUpload = (req, res, next) => {
  uploadPostImage.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

router.use(authenticateToken);

// General feed & explore (must be before /:id)
router.get('/feed',     getFeed);
router.get('/explore',  getExplore);
router.get('/trending', getTrendingPosts);

// Single Post CRUD
router.get('/:id',    getPost);
router.post('/',      handleUpload, createPost);
router.put('/:id',    handleUpload, updatePost);
router.delete('/:id', deletePost);

// Actions
router.post('/:id/like', toggleLike);
router.post('/:id/save', toggleSave);
router.post('/:id/share', sharePost);
router.post('/:id/vote', votePoll);

// Comments
router.get('/:id/comments',                      getComments);
router.post('/:id/comments',                     addComment);
router.put('/:id/comments/:commentId',           updateComment);   // NEW: edit comment
router.delete('/:id/comments/:commentId',        deleteComment);

module.exports = router;
