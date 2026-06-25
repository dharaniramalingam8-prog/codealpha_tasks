const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getNotifications, getUnreadCount, markRead, markAllRead,
} = require('../controllers/notificationController');

router.use(authenticateToken);

router.get('/',         getNotifications);
router.get('/unread',   getUnreadCount);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);

module.exports = router;
