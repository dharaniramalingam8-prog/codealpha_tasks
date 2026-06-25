const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
require('dotenv').config();

// Generate JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  const userData = {
    id: user._id,
    username: user.username,
    email: user.email,
    bio: user.bio,
    avatarColor: user.avatarColor,
    website: user.website,
    createdAt: user.createdAt,
    isEmailVerified: user.isEmailVerified,
  };
  res.status(statusCode).json({ token, user: userData });
};

// ── POST /api/auth/register ──
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({ 
      username, 
      email, 
      password,
      verificationToken
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (err) {
      console.error('Error sending verification email:', err);
      // We still register the user, they can request another email later
    }

    sendTokenResponse(user, 201, res);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({ error: `${field.charAt(0).toUpperCase() + field.slice(1)} already taken` });
    }
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join('. ');
      return res.status(400).json({ error: msg });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/auth/verify/:token ──
exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) {
      return res.status(400).send('<h2 style="font-family:sans-serif;color:red;text-align:center;margin-top:50px;">Invalid or expired verification token.</h2>');
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send(`
      <div style="font-family:sans-serif;text-align:center;margin-top:50px;">
        <h2 style="color:green;">Email Verified Successfully! ✅</h2>
        <p>You can now close this tab and log in to Vibe Social.</p>
      </div>
    `);
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).send('Server error');
  }
};

// ── POST /api/auth/login ──
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Please verify your email address before logging in.' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/auth/forgot-password ──
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Don't leak if email exists
      return res.json({ success: true, message: 'If that email is registered, a reset link was sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (err) {
      console.error('Error sending reset email:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(500).json({ error: 'Error sending email' });
    }

    res.json({ success: true, message: 'If that email is registered, a reset link was sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/auth/reset-password ──
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password has been successfully reset. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/auth/me ──
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      avatarColor: user.avatarColor,
      website: user.website,
      createdAt: user.createdAt,
      isEmailVerified: user.isEmailVerified,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
