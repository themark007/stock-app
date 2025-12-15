// src/index.js (ESM)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

// Import routes after dotenv config
import authRoutes from './routes/authRoutes.js';
import stocksRoutes from './routes/stocks.js';
import subscriptionsRoutes from './routes/subscriptions.js';

import setupSockets from './sockets/index.js';
import startPriceSimulator from './services/priceSimulator.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// Middleware
// ===============================
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL || 'https://your-frontend.onrender.com']
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// Basic Route
// ===============================
app.get('/', (req, res) => {
  res.send('Welcome to the Stock Broker API!');
});

// ===============================
// API Routes
// ===============================
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stocksRoutes);               // GET stocks
app.use('/api', subscriptionsRoutes);               // subscriptions routes use /users/:id/... etc

// ===============================
// Create HTTP + Socket Server
// ===============================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Setup socket listeners
setupSockets(io);

// ===============================
// Start Server
// ===============================
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📝 API endpoints available:`);
  console.log(`   POST /api/auth/signup`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/auth/getme`);
  console.log(`   GET  /api/stocks`);
  console.log(`   WebSocket available for real-time stock updates`);
  
  // Start Price Simulator after a short delay
  setTimeout(() => {
    console.log('📊 Starting price simulator...');
    const simulator = startPriceSimulator(io, { intervalMs: 1000 });
    simulator.start();
  }, 3000);
});

// Log unexpected errors to diagnose early exits
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  // Don't exit - keep server running
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Don't exit - keep server running
});

process.on('exit', (code) => {
  console.log(`Process exit event with code: ${code}`);
});

server.on('error', (err) => {
  console.error('❌ HTTP Server Error:', err);
});

// Keep process alive
setInterval(() => {
  // Heartbeat to keep process running
}, 1000000);
