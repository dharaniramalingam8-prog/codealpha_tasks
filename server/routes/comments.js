const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/posts/:id/comments
router.get('/', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.id);

  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar_color
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(postId);

  res.json(comments);
});

// POST /api/posts/:id/comments
router.post('/', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.id);
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Comment cannot be empty' });
  }

  if (content.trim().length > 300) {
    return res.status(400).json({ error: 'Comment cannot exceed 300 characters' });
  }

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const result = db.prepare(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)'
  ).run(postId, req.user.id, content.trim());

  const comment = db.prepare(`
    SELECT c.*, u.username, u.avatar_color
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(comment);
});

// DELETE /api/posts/:id/comments/:commentId
router.delete('/:commentId', authenticateToken, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(parseInt(req.params.commentId));

  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

  db.prepare('DELETE FROM comments WHERE id = ?').run(comment.id);
  res.json({ success: true });
});

module.exports = router;
