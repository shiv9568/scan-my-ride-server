const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

console.log('Testing Cloudinary Connection...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY);

// Attempt to ping Cloudinary API by getting account info or similar
cloudinary.api.ping()
    .then(result => {
        console.log('✅ Connection Successful:', result);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection Failed:');
        console.error(err);
        process.exit(1);
    });
