const multer = require('multer');
const path = require('path');

// Use Memory Storage for processing images to Base64
const storage = multer.memoryStorage();

// Init upload
const upload = multer({
    storage: storage,
    limits:{fileSize: 2000000}, // 2MB limit for MongoDB performance
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
