const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scanmyride');
        const user = await User.findOne({ email: 'admin@gmail.com' });
        if (user) {
            console.log('User found:');
            console.log('Email:', user.email);
            console.log('Role:', user.role);
        } else {
            console.log('Admin user not found!');
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkAdmin();
