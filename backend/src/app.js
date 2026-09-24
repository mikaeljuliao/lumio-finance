require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./api/auth');
const expenseRoutes = require('./api/expenses');
const limitRoutes = require('./api/limits');

const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://powerful-essence-production-0894.up.railway.app',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Origin blocked: ${origin}`);
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/gastos', expenseRoutes);
app.use('/api/limites', limitRoutes);

module.exports = app;
