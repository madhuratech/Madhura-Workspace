const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

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
    // Allow requests with no origin (like mobile apps or curl requests)
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

// Keep track of connected users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  socket.on('user_connected', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('user_status', { userId, status: 'online' });
    
    // Send currently online users to the newly connected user
    socket.emit('initial_status', Array.from(onlineUsers.keys()));
  });
  
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    
    // Find and remove user from online list, then broadcast offline
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('user_status', { userId, status: 'offline' });
        break;
      }
    }
  });
});

// Pass socket and onlineUsers to request to emit events in controllers
app.use((req, res, next) => {
  req.io = io;
  req.onlineUsers = onlineUsers;
  next();
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.send('Madhura Workspace API is running...');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/users', require('./routes/users'));
app.use('/api/workspaces', require('./routes/workspaceRoutes'));
// app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
