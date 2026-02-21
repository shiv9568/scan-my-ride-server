const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

let storage;

// Check if Cloudinary is configured
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'scanmyride_profiles',
        }
    });
    console.log('✅ Using Cloudinary Storage for Uploads');
} else {
    // Ensure uploads directory exists (Fallback to local)
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir);
    }

    storage = multer.diskStorage({
        destination: './uploads/',
        filename: function(req, file, cb){
            cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        }
    });
    console.log('⚠️ Using Local Disk Storage (Files WILL vanish on server restart)');
}

// Init upload
const upload = multer({
    storage: storage,
    limits:{fileSize: 5000000}, // 5MB limit
    fileFilter: function(req, file, cb){
        checkFileType(file, cb);
    }
});

// Check file type
function checkFileType(file, cb){
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

module.exports = upload;
