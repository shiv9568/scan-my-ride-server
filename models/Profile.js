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
        unique: true
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
        default: '#3b82f6'
    },
    selectedTheme: {
        type: String,
        default: 'carbon'
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
    }
});

module.exports = mongoose.model('Profile', ProfileSchema);
