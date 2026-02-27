const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// @route   POST api/auth/register
// @desc    Register user
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        user = new User({ name, email, password });
        await user.save();

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: ' + err.message);
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

const auth = require('../middleware/auth');

// @route   GET api/auth/me
// @desc    Get current user
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/auth/change-password
// @desc    Change user password
router.put('/change-password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Current password is incorrect' });

        user.password = newPassword;
        await user.save();
        res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Temporary memory store for reset codes (for demo purposes)
const resetStore = new Map();

// @route   POST api/auth/forgot-password
// @desc    Request password reset
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            // Security: Always return success message even if user not found to prevent user enumeration
            return res.json({ msg: 'If this email is registered, a code has been sent.' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        resetStore.set(email, { code, expires: Date.now() + 600_000 }); // 10 mins

        console.log(`\n--- PASSWORD RESET REQUEST ---`);
        console.log(`User: ${email}`);
        console.log(`Code: ${code}`);
        console.log(`------------------------------\n`);

        await sendEmail({
            to: email,
            subject: 'ScanMyRide - Identity Restoration Code',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #0c0c0e; color: white;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #f4b00b; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Identity Restoration</h1>
                        <p style="color: #666; font-size: 10px; text-transform: uppercase;">ScanMyRide Security Hub</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.1);">
                        <p style="font-size: 14px; margin-top: 0;">Hello Commander,</p>
                        <p style="font-size: 14px;">An identity restoration request was detected for your account. Use the authorization code below to establish a new secret key:</p>
                        
                        <div style="background: #f4b00b; padding: 20px; text-align: center; font-size: 32px; font-weight: 900; letter-spacing: 12px; color: black; border-radius: 12px; margin: 25px 0; font-family: monospace;">
                            ${code}
                        </div>
                        
                        <p style="color: #888; font-size: 12px; font-weight: bold; text-align: center;">This logic gate expires in 10 minutes.</p>
                    </div>
                    <p style="color: #444; font-size: 11px; margin-top: 25px; text-align: center;">
                        If you did not initiate this sequence, please ignore this transmission. Your current secret key remains secure.
                    </p>
                    <div style="border-top: 1px solid #222; margin-top: 25px; padding-top: 20px; text-align: center;">
                        <p style="color: #666; font-size: 9px; text-transform: uppercase; letter-spacing: 2px;">Proprietary Scanning Logic © ScanMyRide Ecosystem</p>
                    </div>
                </div>
            `
        });

        res.json({ msg: 'Restoration code has been sent to your email.' });
    } catch (err) {
        console.error("CRITICAL AUTH ERROR (forgot-password):", err);
        res.status(500).json({ 
            msg: 'Failed to dispatch restoration sequence.', 
            error: err.message, // Including error message to help the user identify missing env vars in production
            hint: !process.env.EMAIL_USER ? 'Check if EMAIL_USER is set in Render dashboard.' : 'Check if EMAIL_PASS is a valid 16-digit App Password.'
        });
    }
});

// @route   POST api/auth/reset-password
// @desc    Reset password using code
router.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        const record = resetStore.get(email);
        if (!record || record.code !== code || Date.now() > record.expires) {
            return res.status(400).json({ msg: 'Invalid or expired code' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.password = newPassword;
        await user.save();
        resetStore.delete(email);

        res.json({ msg: 'Password reset successful. You can now login.' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
