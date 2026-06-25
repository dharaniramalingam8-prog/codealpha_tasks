const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { uploadPostImage } = require('../middleware/upload');
const { uploadStory, getFeedStories, markViewed } = require('../controllers/storyController');

router.use(authenticateToken);

router.post('/', uploadPostImage.single('image'), uploadStory);
router.get('/feed', getFeedStories);
router.post('/:id/view', markViewed);

module.exports = router;
