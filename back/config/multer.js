const multer = require('multer');

// Use memory storage so files are available in `file.buffer`
const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = upload;
