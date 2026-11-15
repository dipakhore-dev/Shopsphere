/**
 * Asks Cloudinary for a resized, auto-format (WebP/AVIF) copy instead of the full original.
 * Non-Cloudinary URLs (e.g. demo placeholders) are returned unchanged.
 */
export function optimizeImageUrl(url, width = 600) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}
