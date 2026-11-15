import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { MAX_PRODUCT_IMAGES } from '../utils/constants.js';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Files stay in memory (max 5 MB x 6) and are streamed straight to Cloudinary,
 * so nothing is ever written to the server's disk.
 * The real file type is verified again from the file's bytes in the controller.
 */
export const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_PRODUCT_IMAGES, fields: 0 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_TYPES.has(file.mimetype)) return cb(null, true);
    return cb(ApiError.badRequest('Only JPEG, PNG or WebP images are allowed'));
  },
}).array('images', MAX_PRODUCT_IMAGES);
