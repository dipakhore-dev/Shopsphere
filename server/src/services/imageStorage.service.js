import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Thin storage abstraction. Production uses Cloudinary; tests swap in a fake
 * with setImageStorage() so no network or credentials are needed.
 *
 * adapter.upload(buffer, { folder }) -> { url, publicId }
 * adapter.destroy(publicId)          -> void
 */
const cloudinaryAdapter = {
  async upload(buffer, { folder }) {
    if (!env.cloudinary.configured) {
      throw new ApiError(503, 'Image uploads are not configured on this server', undefined, 'UPLOADS_NOT_CONFIGURED');
    }

    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          // Downscale huge originals once, at upload time (never upscale).
          transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary returned no result'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(buffer);
    });
  },

  async destroy(publicId) {
    await cloudinary.uploader.destroy(publicId);
  },
};

let adapter = cloudinaryAdapter;

export const setImageStorage = (custom) => {
  adapter = custom ?? cloudinaryAdapter;
};

export const uploadImage = (buffer, options) => adapter.upload(buffer, options);

/** Best-effort cleanup: a failure to delete must never fail the request. */
export const deleteImages = async (publicIds) => {
  await Promise.allSettled(publicIds.map((id) => adapter.destroy(id)));
};

/** Every seller uploads into their own folder; this is also how ownership is verified later. */
export const sellerImageFolder = (userId) => `shopsphere/products/${userId}`;

/** Only images that were uploaded to OUR Cloudinary account are accepted in product payloads. */
export const isAllowedImageUrl = (url) =>
  Boolean(env.cloudinary.cloudName) &&
  url.startsWith(`https://res.cloudinary.com/${env.cloudinary.cloudName}/image/upload/`);
