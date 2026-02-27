const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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
// @desc    Request password reset (Mock)
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'If this email is registered, a code has been sent.' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        resetStore.set(email, { code, expires: Date.now() + 600000 }); // 10 mins

        // Send Real Email
        const mailOptions = {
            from: `"ScanMyRide Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'ScanMyRide - Identity Restoration Code',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #f4b00b; text-align: center;">Identity Restoration</h2>
                    <p>Hello Commander,</p>
                    <p>You requested an identity restoration code for your ScanMyRide account. Use the code below to reset your secret key:</p>
                    <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #333; border-radius: 5px; margin: 20px 0;">
                        ${code}
                    </div>
                    <p style="color: #666; font-size: 12px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="text-align: center; color: #999; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">Proprietary Scanning Logic © ScanMyRide</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`\n📧 EMAIL SENT TO ${email}: ${code} 📧\n`);

        res.json({ msg: 'Restoration code has been sent to your email.' });
    } catch (err) {
        console.error("Email Error:", err);
        res.status(500).json({ msg: 'Failed to send email. Ensure server credentials are correct.' });
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
