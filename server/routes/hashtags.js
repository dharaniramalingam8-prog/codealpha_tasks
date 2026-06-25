const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getTrending, getHashtagFeed } = require('../controllers/hashtagController');

router.use(authenticateToken);

router.get('/trending', getTrending);
router.get('/:tag',     getHashtagFeed);

module.exports = router;
