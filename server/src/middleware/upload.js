const multer = require('multer');

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED[file.mimetype]) {
    const err = new Error('Photo must be a JPG, PNG or WEBP image');
    err.status = 400;
    return cb(err);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = {
  upload,
  ALLOWED,
};