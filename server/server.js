const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const path = require('path');
const compression = require('compression');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Setup CORS allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://madhura-workspace-ruddy.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

// Setup Socket.io
const io = new Server(server, {
  cors: corsOptions
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  socket.on('user_connected', (userId) => {
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);
    io.emit('user_status', { userId, status: 'online' });
    socket.emit('initial_status', Array.from(onlineUsers.keys()));
  });
  
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    for (const [userId, socketIds] of onlineUsers.entries()) {
      if (socketIds.has(socket.id)) {
        socketIds.delete(socket.id);
        if (socketIds.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user_status', { userId, status: 'offline' });
        }
        break;
      }
    }
  });
});

app.use((req, res, next) => {
  req.io = io;
  req.onlineUsers = onlineUsers;
  next();
});

// ── Middleware ──────────────────────────────────────────────────────────────
// Gzip compression: reduces response size by ~70%
app.use(compression({
  threshold: 512,           // compress responses > 512 bytes
  level: 6,                 // balanced speed/compression
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '100mb' }));

// Cache static uploads (1 day)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true,
}));

// ── Health / Keep-Alive Endpoint ─────────────────────────────────────────────
// Mobile app pings this every 14 min to prevent Render cold starts
app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'ok', ts: Date.now() });
});

app.get('/', (req, res) => {
  res.send('Madhura Workspace API is running...');
});

app.get('/api/debug/online_users', (req, res) => {
  const users = {};
  for (const [key, value] of onlineUsers.entries()) {
    users[key] = Array.from(value);
  }
  res.json(users);
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/auth/google', require('./routes/googleAuthRoutes'));
app.use('/api/auth/microsoft', require('./routes/microsoftAuthRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/workspaces', require('./routes/workspaceRoutes'));
app.use('/api/workspaces/:workspaceId/notes', require('./routes/notes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/invitations', require('./routes/invitationRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/reminders', require('./routes/reminderRoutes'));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
