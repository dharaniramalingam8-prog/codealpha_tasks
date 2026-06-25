const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const { initSocket } = require('./socket');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// ── Initialize Socket.IO ──
initSocket(server);

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// ── Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/hashtags', require('./routes/hashtags'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
// ── Phase 3 New Routes ──
app.use('/api/stories', require('./routes/stories'));
app.use('/api/search', require('./routes/search'));
// ── Phase 4 ──
app.use('/api/reels', require('./routes/reels'));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── SPA fallback ──
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Vibe Social v2 running at http://localhost:${PORT}`);
  console.log(`   MongoDB: ${process.env.MONGO_URI}`);
  console.log(`   Socket.IO: enabled`);
});
