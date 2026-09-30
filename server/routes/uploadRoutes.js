const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

// Use memory storage so files are streamed directly to Cloudinary without relying on ephemeral disks
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, originalname) => {
  return new Promise((resolve, reject) => {
    const nameWithoutExt = path.parse(originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = `${nameWithoutExt}-${Date.now()}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'madhura_workspace',
        resource_type: 'auto',
        public_id: publicId,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

// @desc    Upload file
// @route   POST /api/upload
// @access  Private
router.post('/', protect, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a file' });
  }

  try {
    const isCloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    if (isCloudinaryConfigured) {
      const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      return res.status(201).json({
        url: result.secure_url,
        fileName: req.file.originalname,
        fileType: req.file.mimetype || (result.resource_type === 'image' ? 'image/jpeg' : result.resource_type),
      });
    }

    // Fallback to local storage if Cloudinary keys are not yet provided
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const ext = path.extname(req.file.originalname);
    const filename = `${req.file.fieldname}-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    return res.status(201).json({
      url: `/uploads/${filename}`,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload handler error:', error);
    return res.status(500).json({
      message: 'Failed to upload file',
      error: error.message,
    });
  }
});

module.exports = router;
