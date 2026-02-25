const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Filter = require('bad-words'); // Profanity filter

// @route   GET api/profile/me
// @desc    Get all user's profiles
router.get('/me', auth, async (req, res) => {
    try {
        const profiles = await Profile.find({ user: req.user.id });
        res.json(profiles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

const upload = require('../middleware/upload');

// @route   POST api/profile
// @desc    Create or update user profile
const uploadMiddleware = (req, res, next) => {
    upload.fields([
        { name: 'profileImage', maxCount: 1 },
        { name: 'carImage', maxCount: 1 },
        { name: 'customQrLogo', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            const msg = err.code === 'LIMIT_FILE_SIZE'
                ? 'Image too large. Max 10MB allowed.'
                : err.message || 'Image upload failed';
            return res.status(400).json({ msg });
        }
        next();
    });
};
router.post('/', [auth, uploadMiddleware], async (req, res) => {
    const {
        id, // Add id for updates
        carName, ownerName, phoneNumber, profession, 
        instagram, linkedin, emergencyContact, bloodGroup, 
        city, isPublic, showPhone, emergencyMode, themeColor, selectedTheme, isVerified,
        specs, youtubeLink, uiMode, fontStyle,
        profileType, resumeLink, workDetails, carCompany, qrVariant
    } = req.body;

    const profileFields = {
        user: req.user.id,
        carName, ownerName, phoneNumber, profession, 
        instagram, linkedin, emergencyContact, bloodGroup, 
        city, isPublic, showPhone, emergencyMode, themeColor, selectedTheme,
        specs: typeof specs === 'string' ? JSON.parse(specs) : specs,
        youtubeLink, uiMode, fontStyle,
        profileType, resumeLink, workDetails, carCompany, qrVariant
    };

    // Only allow setting isVerified if explicitly provided (usually for Admin tasks)
    // For regular updates, we don't want to overwrite it with undefined
    if (isVerified !== undefined) {
        profileFields.isVerified = isVerified;
    }
    
    if (req.files) {
        if (req.files.profileImage) {
            const file = req.files.profileImage[0];
            const base64 = file.buffer.toString('base64');
            profileFields.profileImage = `data:${file.mimetype};base64,${base64}`;
        }
        if (req.files.carImage) {
            const file = req.files.carImage[0];
            const base64 = file.buffer.toString('base64');
            profileFields.carImage = `data:${file.mimetype};base64,${base64}`;
        }
        if (req.files.customQrLogo) {
            const file = req.files.customQrLogo[0];
            const base64 = file.buffer.toString('base64');
            profileFields.customQrLogo = `data:${file.mimetype};base64,${base64}`;
        }
    }

    try {
        let profile;
        if (id) {
            // Update specific profile
            // Use $set with only the fields we built to avoid wiping out other fields like uniqueId or count
            profile = await Profile.findOneAndUpdate(
                { _id: id, user: req.user.id },
                { $set: profileFields },
                { returnDocument: 'after' }
            );
        } else {
            // Create new profile - Use a secure random hash for the URL (16 characters)
            profileFields.uniqueId = crypto.randomBytes(8).toString('hex');
            profile = new Profile(profileFields);
            await profile.save();
        }
        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/profile/public/:uniqueId
// @desc    Get profile by uniqueId (Public)
router.get('/public/:uniqueId', async (req, res) => {
    try {
        const profile = await Profile.findOne({ uniqueId: req.params.uniqueId }).lean();
        if (!profile || !profile.isPublic) {
            return res.status(404).json({ msg: 'Profile not found' });
        }

        // Allow browser to cache for 30s, serve stale for 60s while revalidating in background
        res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');

        // Return instantly to user
        res.json(profile);

        // Track scan in background (no await)
        Profile.findOneAndUpdate(
            { uniqueId: req.params.uniqueId },
            { 
                $inc: { scanCount: 1 },
                $set: { lastScanned: Date.now() }
            }
        ).catch(err => console.error('Background Scan Count Error:', err));

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/profile/public/:uniqueId/guestbook
// @desc    Add a message to the guestbook (Public)
router.post('/public/:uniqueId/guestbook', async (req, res) => {
    const { name, message } = req.body;
    const filter = new Filter();

    if (!message) return res.status(400).json({ msg: 'Message is required' });

    try {
        const cleanMessage = filter.clean(message);
        const newEntry = {
            name: name || 'Anonymous Enthusiast',
            message: cleanMessage,
            date: Date.now()
        };

        const profile = await Profile.findOneAndUpdate(
            { uniqueId: req.params.uniqueId },
            { $push: { guestbook: { $each: [newEntry], $position: 0 } } }, // Add to top
            { returnDocument: 'after' }
        );

        if (!profile) return res.status(404).json({ msg: 'Profile not found' });
        res.json(profile.guestbook);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/profile/public/:uniqueId/alert
// @desc    Send a private parking alert/notification (Public scanner -> Owner)
router.post('/public/:uniqueId/alert', async (req, res) => {
    const { message } = req.body;

    if (!message) return res.status(400).json({ msg: 'Alert message is required' });

    try {
        const newAlert = {
            type: 'alert',
            message,
            date: Date.now(),
            read: false
        };

        const profile = await Profile.findOneAndUpdate(
            { uniqueId: req.params.uniqueId },
            { $push: { notifications: { $each: [newAlert], $position: 0 } } },
            { returnDocument: 'after' }
        );

        if (!profile) return res.status(404).json({ msg: 'Profile not found' });
        res.json({ msg: 'Alert sent successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
