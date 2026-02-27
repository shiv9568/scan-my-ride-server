const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['emergency', 'parking', 'call_request', 'other'],
        default: 'call_request'
    },
    message: {
        type: String,
        trim: true
    },
    senderIp: String,
    senderUserAgent: String,
    status: {
        type: String,
        enum: ['new', 'read', 'resolved'],
        default: 'new'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Alert', AlertSchema);
