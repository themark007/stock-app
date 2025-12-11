// src/index.js (ESM)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/authRoutes.js';
import stocksRoutes from './routes/stocks.js';
import subscriptionsRoutes from './routes/subscriptions.js';

import setupSockets from './sockets/index.js';
import startPriceSimulator from './services/priceSimulator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// Middleware
// ===============================
app.use(cors());
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
    origin: '*', // set allowed frontend domains later
  }
});

// Setup socket listeners
setupSockets(io);

// ===============================
// Start Price Simulator (1s interval)
// ===============================
const simulator = startPriceSimulator(io, { intervalMs: 1000 });
simulator.start();

// ===============================
// Start Server
// ===============================
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
