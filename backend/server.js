const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Validate critical env vars
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'CHANGE_ME_TO_A_RANDOM_64_CHAR_STRING') {
    console.error('FATAL: JWT_SECRET is not set or is using the default placeholder. Set it in .env');
    process.exit(1);
}

const app = express();

// --------------- Middleware ---------------

// CORS — restrict to your own frontend in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5000', 'http://127.0.0.1:5000'];
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (same-origin, Postman, etc.)
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve static files

// Global rate limiter — 100 requests per 15 min per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', globalLimiter);

// Stricter limiter for auth routes — 20 per 15 min
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many login/register attempts. Please try again later.' }
});

// --------------- Database Connection ---------------
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected...'))
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        if (process.env.VERCEL !== '1') process.exit(1);
    });

// Handle runtime disconnections
mongoose.connection.on('error', err => console.error('MongoDB runtime error:', err.message));
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected. Attempting reconnect...'));

// --------------- Routes ---------------
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/funds', require('./routes/funds'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/chat', require('./routes/chat'));

// --------------- Error Handling ---------------
// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
