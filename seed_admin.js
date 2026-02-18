const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scanmyride');
        console.log('MongoDB connected for seeding...');

        const adminEmail = 'admin@gmail.com';
        const adminPassword = 'admin';

        let admin = await User.findOne({ email: adminEmail });

        if (admin) {
            console.log('Admin already exists. Updating password and role...');
            admin.password = adminPassword; // Pre-save hook will hash it
            admin.role = 'admin';
            await admin.save();
        } else {
            console.log('Creating new admin user...');
            admin = new User({
                name: 'System Admin',
                email: adminEmail,
                password: adminPassword,
                role: 'admin'
            });
            await admin.save();
        }

        console.log('Admin seeded successfully!');
        console.log('Email: ' + adminEmail);
        console.log('Password: ' + adminPassword);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAdmin();
