const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getConversations, getOrCreateConversation,
  getMessages, sendMessage, getUnreadCount,
} = require('../controllers/messageController');

router.use(authenticateToken);

router.get('/conversations',                             getConversations);
router.post('/conversations/:userId',                    getOrCreateConversation);
router.get('/conversations/:id/messages',               getMessages);
router.post('/conversations/:id/messages',              sendMessage);
router.get('/unread',                                   getUnreadCount);

module.exports = router;
