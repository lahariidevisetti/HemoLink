// services/cloudinary.service.js — Cloudinary upload service with resilient local fallback
const cloudinary = require('cloudinary').v2;
const fs         = require('fs');
const path       = require('path');
require('dotenv').config();

const CLOUD_NAME  = process.env.CLOUDINARY_CLOUD_NAME || 'wk6iylvx';
const API_KEY     = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET  = process.env.CLOUDINARY_API_SECRET || 'mO4OMPrVqB064rau1p1-H6alD9s';
const FOLDER_NAME = process.env.CLOUDINARY_FOLDER || 'Hemo_LInk';

// Ensure local uploads directory exists for fallback
const LOCAL_UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'documents');
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

// Configure Cloudinary if credentials are present
const isCloudinaryConfigured = Boolean(API_KEY && API_KEY.trim() !== '' && API_SECRET);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key:    API_KEY,
    api_secret: API_SECRET,
    secure:     true,
  });
  console.log(`☁️ Cloudinary configured for cloud [${CLOUD_NAME}], folder [${FOLDER_NAME}]`);
} else {
  console.log(`ℹ️ Cloudinary API_KEY not yet set. Operating in local storage mode for [${FOLDER_NAME}].`);
}

/**
 * Upload medical / doctor prescription document
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} originalname - Original file name
 * @param {string} mimetype - File mimetype
 * @param {string} serverBaseUrl - Current server host for local fallback URLs
 * @returns {Promise<{ url: string, provider: 'cloudinary' | 'local' }>}
 */
async function uploadDocument(buffer, originalname, mimetype, serverBaseUrl = 'http://localhost:5000') {
  const safeBaseName = path.parse(originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = path.extname(originalname) || '.jpg';
  const timestamp = Date.now();

  // Try Cloudinary upload if API key configured
  if (isCloudinaryConfigured) {
    try {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: FOLDER_NAME,
            resource_type: 'auto',
            public_id: `doc_${timestamp}_${safeBaseName}`,
          },
          (error, res) => {
            if (error) return reject(error);
            resolve(res);
          }
        );
        uploadStream.end(buffer);
      });

      console.log(`✅ Uploaded to Cloudinary [${FOLDER_NAME}]:`, result.secure_url);
      return {
        url: result.secure_url,
        public_id: result.public_id,
        provider: 'cloudinary',
      };
    } catch (cloudErr) {
      console.warn('⚠️ Cloudinary upload failed, falling back to local storage:', cloudErr.message);
    }
  }

  // Fallback: Local file system in backend/uploads/documents/
  const localFileName = `doc_${timestamp}_${safeBaseName}${ext}`;
  const localFilePath = path.join(LOCAL_UPLOADS_DIR, localFileName);
  fs.writeFileSync(localFilePath, buffer);

  const localUrl = `${serverBaseUrl}/uploads/documents/${localFileName}`;
  console.log(`📁 Saved document locally:`, localUrl);
  return {
    url: localUrl,
    provider: 'local',
    fileName: localFileName,
  };
}

module.exports = {
  uploadDocument,
  isCloudinaryConfigured,
  CLOUD_NAME,
  FOLDER_NAME,
};
