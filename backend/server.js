// server.js — HemoLink Express App Entry Point

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { testConnection } = require('./config/db');

// Route files
const authRoutes     = require('./routes/auth.routes');
const donorRoutes    = require('./routes/donor.routes');
const receiverRoutes = require('./routes/receiver.routes');
const publicRoutes   = require('./routes/public.routes');

const path       = require('path');
const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'HemoLink API is running 🩸', time: new Date() });
});

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/public',   publicRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/donor',    donorRoutes);
app.use('/api/receiver', receiverRoutes);

// ─── 404 handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ─── Start ────────────────────────────────────────────────────
async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 HemoLink backend running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
