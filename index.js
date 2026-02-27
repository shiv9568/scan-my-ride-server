
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust first-hop proxy (Render, Vercel, etc.)
app.use(compression()); // Compress all responses
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
    crossOriginResourcePolicy: false, // Required for displaying local/external images
}));


// ── CORS ─────────────────────────────────────────────────────────────────────
// ⚠️  MUST be registered BEFORE the rate limiter so every response
//     (including 429 / error responses) includes CORS headers.
const STATIC_ORIGINS = [
    'https://scan-my-ride-client.vercel.app',
    'https://scanmyride.in',
    'https://www.scanmyride.in',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const envOrigins = (process.env.ALLOWED_ORIGINS || '')
            .split(',').map(s => s.trim()).filter(Boolean);

        const allowed = [...STATIC_ORIGINS, ...envOrigins];

        // Allow ANY *.vercel.app preview deployment
        if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return callback(null, true);
        // Allow any LAN IP (for mobile dev testing)
        if (/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return callback(null, true);
        // Allow any localhost port
        if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);

        if (allowed.includes(origin)) return callback(null, true);

        console.warn('CORS blocked:', origin);
        callback(new Error('CORS: Origin not allowed - ' + origin));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
// Note: cors() middleware above automatically handles OPTIONS preflight requests

// Rate Limiting (registered AFTER CORS so error responses include CORS headers)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { msg: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);


app.use(express.json({ limit: '10mb' })); 
// Serve uploaded images with explicit CORS headers so mobile browsers can
// fetch them into a canvas (required for the QR sticker download feature)
app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/admin', require('./routes/admin'));

// Base Route
app.get('/', (req, res) => {
    res.send('ScanMyRide API is running stably...');
});

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ msg: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SYSTEM ERROR:', err.stack);
    res.status(err.status || 500).json({
        msg: 'The server encountered an issue. Please try again later.',
        error: err.message
    });
});

const connectDB = async () => {
    try {
        const connOptions = {
            maxPoolSize: 10,             // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to connect for 5 seconds
            socketTimeoutMS: 45000,      // Close sockets after 45 seconds of inactivity
            family: 4                    // Use IPv4, skip trying IPv6
        };
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scanmyride', connOptions);
        console.log('✅ MongoDB connected successfully');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        setTimeout(connectDB, 5000);
    }
};

connectDB();

// ── Health check endpoint (used by keep-alive ping, uptime monitors) ──────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server fully operational on port ${PORT}`);

    // ─── Keep-Alive Ping ───────────────────────────────────────────────────
    // Render free tier spins down after 15 min of inactivity → 30-60s cold start.
    // Ping /health every 10 min to keep the server warm.
    const pingTarget = process.env.RENDER_EXTERNAL_URL
        ? `${process.env.RENDER_EXTERNAL_URL}/health`
        : 'https://scan-my-ride-server.onrender.com/health';

    const https = require('https');
    const doPing = () => {
        https.get(pingTarget, (res) => {
            console.log(`♻️  Keep-alive ping → ${res.statusCode}`);
        }).on('error', (err) => {
            console.warn('⚠️  Keep-alive ping failed:', err.message);
        });
    };
    // First ping after 30s (give server time to fully start)
    setTimeout(doPing, 30_000);
    setInterval(doPing, 10 * 60 * 1000); // Every 10 minutes
    console.log(`📡 Keep-alive enabled → pinging ${pingTarget} every 10 min`);
});
