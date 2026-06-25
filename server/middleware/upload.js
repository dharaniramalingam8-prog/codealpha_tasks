const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary, isConfigured } = require('../config/cloudinary');

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
  }
};

const videoFilter = (req, file, cb) => {
  const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only MP4, WebM, and MOV videos are allowed'), false);
  }
};

let uploadPostImage, uploadAvatar, uploadCover, uploadProfileImages, uploadReel, deleteImage, isCloud;

if (isConfigured) {
  // ── Cloudinary Storage ──
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  const makeStorage = (folder, resourceType = 'image') => new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `vibe/${folder}`,
      resource_type: resourceType,
    },
  });

  uploadPostImage = multer({ storage: makeStorage('posts'), fileFilter: imageFilter, limits: { fileSize: MAX_IMAGE_SIZE } });
  uploadAvatar = multer({ storage: makeStorage('avatars'), fileFilter: imageFilter, limits: { fileSize: MAX_IMAGE_SIZE } });
  uploadCover = multer({ storage: makeStorage('covers'), fileFilter: imageFilter, limits: { fileSize: MAX_IMAGE_SIZE } });
  uploadProfileImages = multer({ storage: makeStorage('profiles'), fileFilter: imageFilter, limits: { fileSize: MAX_IMAGE_SIZE } });
  uploadReel = multer({ storage: makeStorage('reels', 'video'), fileFilter: videoFilter, limits: { fileSize: MAX_VIDEO_SIZE } });
  
  deleteImage = async (publicId) => {
    if (publicId) await cloudinary.uploader.destroy(publicId);
  };
  
  isCloud = true;
} else {
  // ── Local Storage (Fallback) ──
  const uploadDir = path.join(__dirname, '../../public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const makeStorage = (prefix) => multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });

  uploadPostImage = multer({ storage: makeStorage('post'), fileFilter: imageFilter, limits: { fileSize: MAX_IMAGE_SIZE } });
  uploadAvatar = multer({ storage: makeStorage('avatar'), fileFilter: imageFilter, limits: { fileSize: MAX_IMAGE_SIZE } });
  uploadCover = multer({ storage: makeStorage('cover'), fileFilter: imageFilter, limits: { fileSize: MAX_IMAGE_SIZE } });
  uploadProfileImages = multer({ storage: makeStorage('profile'), fileFilter: imageFilter, limits: { fileSize: MAX_IMAGE_SIZE } });
  uploadReel = multer({ storage: makeStorage('reel'), fileFilter: videoFilter, limits: { fileSize: MAX_VIDEO_SIZE } });

  deleteImage = async (publicId) => {
    // Local deletion is not implemented in fallback but we return silent success
    return;
  };
  
  isCloud = false;
}

module.exports = {
  uploadPostImage,
  uploadAvatar,
  uploadCover,
  uploadProfileImages,
  uploadReel,
  deleteImage,
  isCloud,
};
