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
// @desc    Get all users with their profiles + System Stats (Admin only)
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
                    email: 1,
                    role: 1,
                    date: 1,
                    photo: { $arrayElemAt: ['$profiles.profileImage', 0] },
                    profileCount: { $size: '$profiles' },
                    totalScans: { $sum: '$profiles.scanCount' }
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

// @route   DELETE api/admin/users/:userId
// @desc    Delete a user and ALL their profiles (Admin only)
router.delete('/users/:userId', [auth, adminAuth], async (req, res) => {
    try {
        const userId = req.params.userId;

        // Prevent admin from deleting themselves
        if (userId === req.user.id) {
            return res.status(400).json({ msg: 'Cannot delete your own admin account' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Delete all profiles belonging to this user
        const deletedProfiles = await Profile.deleteMany({ user: userId });

        // Delete the user
        await User.findByIdAndDelete(userId);

        res.json({
            msg: 'User deleted successfully',
            deletedProfiles: deletedProfiles.deletedCount
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
