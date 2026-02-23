const multer = require('multer');
const path = require('path');

// Use Memory Storage for processing images to Base64
const storage = multer.memoryStorage();

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB – mobile cameras need this
    fileFilter: function(req, file, cb){
        checkFileType(file, cb);
    }
});

// Check file type – supports mobile formats (HEIC, WEBP)
function checkFileType(file, cb){
    const filetypes = /jpeg|jpg|png|gif|webp|heic|heif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/(jpeg|jpg|png|gif|webp|heic|heif)/.test(file.mimetype);

    if(mimetype || extname){
        return cb(null, true);
    } else {
        cb(new Error('Only image files (JPG, PNG, GIF, WEBP, HEIC) are allowed'));
    }
}

module.exports = upload;
