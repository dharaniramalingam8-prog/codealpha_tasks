const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getReels, uploadReel, toggleLike, addComment, shareReel } = require('../controllers/reelController');
const { uploadReel: uploadVideo } = require('../middleware/upload');

// Handle Multer upload errors
const handleUpload = (req, res, next) => {
  uploadVideo.single('video')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

router.use(authenticateToken);

router.get('/', getReels);
router.post('/', handleUpload, uploadReel);
router.post('/:id/like', toggleLike);
router.post('/:id/comment', addComment);
router.post('/:id/share', shareReel);

module.exports = router;
