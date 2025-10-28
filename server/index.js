const express = require('express');
const http = require('http'); // NEW: For Socket.IO server
const socketIo = require('socket.io'); // NEW: Import
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app); // NEW: Wrap Express in HTTP server

app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.error('MongoDB error:', err));

// NEW: Initialize Socket.IO
const io = socketIo(server, {
  cors: {
origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL || '*' : "http://localhost:3000",  
  methods: ["GET", "POST"]
  }
});

// Routes
const historyRoutes = require('./routes/history');
app.use('/api/history', historyRoutes);

// Test fetch endpoint
const { fetchAndQueueJobs } = require('./services/fetcher');
app.post('/test-fetch', express.json(), async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  await fetchAndQueueJobs(url);
  res.json({ message: 'Fetch queued' });
});

// Health
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Start cron and worker
const cronJob = require('./schedulers/cron');
cronJob.start();
const { worker, setIO } = require('./workers/importer'); // Destructure setIO
setIO(io); // NEW: Link IO to worker

server.listen(PORT, () => { // NEW: server.listen, not app.listen
  console.log(`Server + Socket.IO running on http://localhost:${PORT}`);
});