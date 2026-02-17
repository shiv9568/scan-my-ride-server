const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

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
router.post('/', [auth, upload.fields([{ name: 'profileImage', maxCount: 1 }, { name: 'carImage', maxCount: 1 }])], async (req, res) => {
    const {
        id, // Add id for updates
        carName, ownerName, phoneNumber, profession, 
        instagram, linkedin, emergencyContact, bloodGroup, 
        city, isPublic, showPhone, emergencyMode, themeColor, selectedTheme, isVerified,
        specs, youtubeLink
    } = req.body;

    const profileFields = {
        user: req.user.id,
        carName, ownerName, phoneNumber, profession, 
        instagram, linkedin, emergencyContact, bloodGroup, 
        city, isPublic, showPhone, emergencyMode, themeColor, selectedTheme, isVerified,
        specs: typeof specs === 'string' ? JSON.parse(specs) : specs,
        youtubeLink
    };
    
    if (req.files) {
        if (req.files.profileImage) {
            profileFields.profileImage = req.files.profileImage[0].path.replace(/\\/g, "/");
        }
        if (req.files.carImage) {
            profileFields.carImage = req.files.carImage[0].path.replace(/\\/g, "/");
        }
    }

    try {
        let profile;
        if (id) {
            // Update specific profile
            profile = await Profile.findOneAndUpdate(
                { _id: id, user: req.user.id },
                { $set: profileFields },
                { new: true }
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
        const profile = await Profile.findOne({ uniqueId: req.params.uniqueId });
        if (!profile || !profile.isPublic) {
            return res.status(404).json({ msg: 'Profile not found' });
        }
        
        // Track scan
        profile.scanCount += 1;
        profile.lastScanned = Date.now();
        await profile.save();

        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
