
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
app.use(compression()); // Compress all responses
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
    crossOriginResourcePolicy: false, // Required for displaying local/external images
}));

// Rate Limiting: Prevent DDoS and brute force
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per window
    message: { msg: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://scan-my-ride-client.vercel.app',
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5000',
            'http://127.0.0.1:5173',
            'http://192.168.29.115:5173',
            'http://192.168.29.115:5174',
        ];
        // Allow requests with no origin (like mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        // Allow any local network IP (192.168.x.x) for easy local testing
        if (/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error('CORS: Origin not allowed - ' + origin));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-auth-token']
}));

app.use(express.json({ limit: '10mb' })); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server fully operational on port ${PORT} [v2-upload-fix]`);

    // ─── Keep-Alive Ping ───────────────────────────────────────────────────
    // Render free tier spins down after 15 min of inactivity → 30-60s cold start.
    // Ping the base route every 14 min to keep the server warm.
    if (process.env.RENDER_EXTERNAL_URL) {
        const https = require('https');
        const pingUrl = process.env.RENDER_EXTERNAL_URL;
        setInterval(() => {
            https.get(pingUrl, (res) => {
                console.log(`♻️  Keep-alive ping sent → ${res.statusCode}`);
            }).on('error', (err) => {
                console.warn('⚠️  Keep-alive ping failed:', err.message);
            });
        }, 14 * 60 * 1000); // Every 14 minutes
        console.log(`📡 Keep-alive enabled → pinging ${pingUrl} every 14 min`);
    }
});

