const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const User = require('../models/User');
const Alert = require('../models/Alert');
const sendEmail = require('../utils/sendEmail');
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

        Profile.findOneAndUpdate(
            { uniqueId: req.params.uniqueId },
            { 
                $inc: { scanCount: 1 },
                $set: { lastScanned: Date.now() }
            }
        ).catch(err => console.error('Background Scan Track Error:', err));

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
    const { type, message } = req.body;

    try {
        const profile = await Profile.findOne({ uniqueId: req.params.uniqueId }).populate('user', 'email name');
        if (!profile) return res.status(404).json({ msg: 'Profile not found' });

        const owner = profile.user;
        if (!owner) return res.status(400).json({ msg: 'Owner not found for this profile' });

        // Save to database
        const alert = new Alert({
            profile: profile._id,
            owner: owner._id,
            type: type || 'call_request',
            message: message || `A scanner is requesting your attention for your ${profile.carName || 'vehicle'}.`,
            senderIp: req.ip,
            senderUserAgent: req.get('User-Agent')
        });
        await alert.save();

        // Send Email Notification
        const alertNames = {
            emergency: '🚨 EMERGENCY ALERT',
            parking: '🚦 PARKING ISSUE',
            call_request: '📞 CALL REQUEST',
            other: '💬 VEHICLE NOTIFICATION'
        };

        await sendEmail({
            to: owner.email,
            subject: `ScanMyRide - ${alertNames[type] || 'Alert'} for ${profile.carName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 2px solid #f4b00b; border-radius: 15px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #f4b00b; margin: 0;">ScanMy<span style="color: #333;">Ride</span></h1>
                        <p style="text-transform: uppercase; font-size: 10px; tracking: 2px; color: #999;">Privacy-First Alert System</p>
                    </div>
                    
                    <div style="background: #fff8e6; padding: 20px; border-radius: 10px; border-left: 5px solid #f4b00b;">
                        <h2 style="margin-top: 0; color: #856404;">${alertNames[type] || 'New Notification'}</h2>
                        <p>Hello <strong>${owner.name}</strong>,</p>
                        <p>Someone just scanned your QR code and triggered a priority alert for your <strong>${profile.carName || 'Vehicle'}</strong>.</p>
                        
                        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ffeeba; margin: 15px 0;">
                            <p style="margin: 0; font-style: italic; color: #555;">"${alert.message}"</p>
                        </div>
                        
                        <p style="font-size: 12px; color: #856404;">Type: ${type.toUpperCase()}</p>
                    </div>
                    
                    <p style="font-size: 13px; color: #666; margin-top: 20px;">
                        This is an anonymous alert. Your phone number was <strong>not</strong> shown to the scanner. 
                        Please attend to your vehicle if necessary.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="text-align: center; color: #999; font-size: 10px;">PROPRIETARY SCANNING LOGIC © SCANMYRIDE</p>
                </div>
            `
        });

        res.json({ msg: 'Owner has been notified successfully via priority alert.' });
    } catch (err) {
        console.error('Alert System Error:', err);
        res.status(500).json({ msg: 'Alert system is currently offline. Please try again later.' });
    }
});

module.exports = router;
