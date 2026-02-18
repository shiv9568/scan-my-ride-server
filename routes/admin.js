const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Profile = require('../models/Profile');

// Middleware to check if user is admin
const adminAuth = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied: Admin only' });
    }
    next();
};

// @route   GET api/admin/users
// @desc    Get all users with their photos + System Stats (Admin only)
router.get('/users', [auth, adminAuth], async (req, res) => {
    try {
        const users = await User.aggregate([
            {
                $lookup: {
                    from: 'profiles',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'profiles'
                }
            },
            {
                $project: {
                    name: 1,
                    date: 1,
                    photo: { $arrayElemAt: ['$profiles.profileImage', 0] }
                }
            },
            { $sort: { date: -1 } }
        ]);

        const totalProfiles = await Profile.countDocuments();
        const scanStats = await Profile.aggregate([
            { $group: { _id: null, totalScans: { $sum: "$scanCount" } } }
        ]);

        res.json({
            count: users.length,
            totalProfiles,
            totalScans: scanStats.length > 0 ? scanStats[0].totalScans : 0,
            users: users
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
