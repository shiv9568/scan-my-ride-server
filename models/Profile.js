const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uniqueId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    carName: {
        type: String,
        default: 'My Awesome Car'
    },
    carImage: {
        type: String,
        default: ''
    },
    profileImage: {
        type: String,
        default: ''
    },
    ownerName: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        default: ''
    },
    profession: {
        type: String,
        default: ''
    },
    instagram: {
        type: String,
        default: ''
    },
    linkedin: {
        type: String,
        default: ''
    },
    emergencyContact: {
        type: String,
        default: ''
    },
    bloodGroup: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        default: ''
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    showPhone: {
        type: Boolean,
        default: true
    },
    emergencyMode: {
        type: Boolean,
        default: false
    },
    themeColor: {
        type: String,
        default: '#f4b00b'
    },
    selectedTheme: {
        type: String,
        default: 'carbon'
    },
    uiMode: {
        type: String,
        enum: ['dark', 'light'],
        default: 'dark'
    },
    fontStyle: {
        type: String,
        default: 'font-outfit'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    specs: {
        hp: { type: String, default: '' },
        torque: { type: String, default: '' },
        engine: { type: String, default: '' },
        mods: { type: String, default: '' }
    },
    youtubeLink: {
        type: String,
        default: ''
    },
    scanCount: {
        type: Number,
        default: 0
    },
    lastScanned: {
        type: Date
    },
    customQrLogo: {
        type: String,
        default: ''
    },
    guestbook: [{
        name: String,
        message: String,
        date: { type: Date, default: Date.now }
    }],
    profileType: {
        type: String,
        enum: ['car', 'business', 'portfolio'],
        default: 'car'
    },
    resumeLink: {
        type: String,
        default: ''
    },
    workDetails: {
        type: String,
        default: ''
    },
    notifications: [{
        type: { type: String, enum: ['alert', 'message'], default: 'alert' },
        message: String,
        date: { type: Date, default: Date.now },
        read: { type: Boolean, default: false }
    }]
});

module.exports = mongoose.model('Profile', ProfileSchema);
