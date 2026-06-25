const express = require('express');
const router = express.Router();
const { register, login, getMe, verifyEmail, forgotPassword, resetPassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', register);

// GET /api/auth/verify/:token
router.get('/verify/:token', verifyEmail);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

// GET /api/auth/me (protected)
router.get('/me', authenticateToken, getMe);

module.exports = router;
