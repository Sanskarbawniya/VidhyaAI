/**
 * VidyaAI — Main Server Entry Point
 * Node.js + Express + MongoDB + OpenAI + Bhashini
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Route imports
const authRoutes = require('./routes/auth');
const tutorRoutes = require('./routes/tutor');
const feedbackRoutes = require('./routes/feedback');
const plannerRoutes = require('./routes/planner');
const integrityRoutes = require('./routes/integrity');
const translateRoutes = require('./routes/translate');
const progressRoutes = require('./routes/progress');
const teacherRoutes = require('./routes/teacher');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET', 'POST'] }
});

// ─── MIDDLEWARE ───────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please slow down.' }
});
app.use('/api/', apiLimiter);

// Stricter limit for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'AI request limit reached. Wait a moment.' }
});
app.use('/api/tutor/', aiLimiter);
app.use('/api/feedback/', aiLimiter);
app.use('/api/integrity/', aiLimiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ─── DATABASE ─────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('💡 Tip: Check your MONGO_URI in .env');
  });

// ─── ROUTES ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/integrity', integrityRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/teacher', teacherRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VidyaAI API v1.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ─── SOCKET.IO — REAL-TIME STUDY ROOMS ───────────────
require('./config/socket')(io);

// ─── SPA FALLBACK ─────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── ERROR HANDLER ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ─── START SERVER ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎓 ╔══════════════════════════════════╗`);
  console.log(`   ║         VidyaAI Server           ║`);
  console.log(`   ╠══════════════════════════════════╣`);
  console.log(`   ║  🌐 http://localhost:${PORT}         ║`);
  console.log(`   ║  📚 API: /api                    ║`);
  console.log(`   ║  🔥 Env: ${process.env.NODE_ENV || 'development'}              ║`);
  console.log(`   ╚══════════════════════════════════╝\n`);
});

module.exports = { app, server }; 
