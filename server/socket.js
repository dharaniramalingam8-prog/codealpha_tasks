const jwt = require('jsonwebtoken');
require('dotenv').config();

let io;

/**
 * Initialize Socket.IO with the HTTP server
 */
function initSocket(httpServer) {
  const { Server } = require('socket.io');

  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
  });

  // ── JWT Auth middleware for socket connections ──
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    const User = require('./models/User');

    // Join personal room for targeted notifications
    socket.join(`user:${userId}`);
    console.log(`🔌 Socket connected: user ${userId}`);

    // Set online status in DB and broadcast
    try {
      await User.findByIdAndUpdate(userId, { online: true });
      io.emit('user-online', { userId });
    } catch (e) {
      console.error(e);
    }

    // ── DM: join conversation rooms ──
    socket.on('join-conversation', (conversationId) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ── Typing indicators ──
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('user-typing', { userId });
    });

    socket.on('stop-typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('user-stop-typing', { userId });
    });

    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: user ${userId}`);
      try {
        await User.findByIdAndUpdate(userId, { online: false });
        io.emit('user-offline', { userId });
      } catch (e) {
        console.error(e);
      }
    });
  });

  return io;
}

/**
 * Get the initialized Socket.IO instance
 */
function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

/**
 * Emit a notification to a specific user
 */
function emitNotification(recipientId, notification) {
  if (!io) return;
  io.to(`user:${recipientId}`).emit('notification', notification);
}

/**
 * Emit a new message to a conversation room
 */
function emitMessage(conversationId, message) {
  if (!io) return;
  io.to(`conv:${conversationId}`).emit('new-message', message);
}

module.exports = { initSocket, getIO, emitNotification, emitMessage };
