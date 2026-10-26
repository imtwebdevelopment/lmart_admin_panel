import { API_BASE } from './apiConfig';

/**
 * Utility functions for resolving product images in Admin panel.
 * Handles both legacy Firebase Storage URLs and new MongoDB-stored images.
 */

export const FALLBACK_IMAGE = '/no-image.svg';

const getMongoImageUrl = (id) => `${API_BASE.replace(/\/$/, '')}/images/${id}`;

export const handleImageError = (e) => {
  if (e?.target && !e.target.src.endsWith(FALLBACK_IMAGE)) {
    e.target.onerror = null;
    e.target.src = FALLBACK_IMAGE;
  }
};

export const resolveImageUrl = (img) => {
  if (!img) return FALLBACK_IMAGE;

  let raw = '';
  if (typeof img === 'string') {
    raw = img.trim();
  } else if (typeof img === 'object') {
    const imageReference = img.url || img.src || img.mainImageUrl || img.imageUrl;
    raw = typeof imageReference === 'string' ? imageReference.trim() : '';
  }

  if (!raw) return FALLBACK_IMAGE;

  // 1. If it's a mongodb:// URI (e.g. mongodb://6adf...)
  const mongoUri = raw.match(/^mongodb:\/\/([0-9a-fA-F]{24})$/);
  if (mongoUri) return getMongoImageUrl(mongoUri[1]);

  // 2. If it's a pure ObjectId string (24 hex characters)
  if (/^[0-9a-fA-F]{24}$/.test(raw)) {
    return getMongoImageUrl(raw);
  }

  // 3. If it contains /api/images/:id anywhere (relative path, localhost URL, 127.0.0.1, or old backend domain)
  const imageMatch = raw.match(/(?:^|https?:\/\/[^/]+)?\/api\/images\/([0-9a-fA-F]{24})(?:[?#].*)?$/i);
  if (imageMatch) {
    return getMongoImageUrl(imageMatch[1]);
  }

  // 4. Data URLs (e.g. base64 preview)
  if (raw.startsWith('data:')) return raw;

  // 5. Any other HTTP/HTTPS URL (Firebase, Cloudinary, S3, etc.)
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsedUrl = new URL(raw);
      const isLoopback = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(parsedUrl.hostname);
      const hexMatch = parsedUrl.pathname.match(/([0-9a-fA-F]{24})/);
      if (isLoopback && hexMatch) {
        return getMongoImageUrl(hexMatch[1]);
      }
    } catch (error) {
      console.error('Unable to resolve image URL:', error);
    }
  }
  return raw;
};

export const getAdminProductImage = (product) => {
  if (product?.mainImageUrl) return resolveImageUrl(product.mainImageUrl);

  if (Array.isArray(product?.imageUrls)) {
    const main = product.imageUrls.find(img => img.isMain);
    if (main?.url) return resolveImageUrl(main.url);
    if (product.imageUrls[0]?.url) return resolveImageUrl(product.imageUrls[0].url);
    if (typeof product.imageUrls[0] === 'string') return resolveImageUrl(product.imageUrls[0]);
  }

  if (Array.isArray(product?.sourceImages?.gallery)) {
    const img = product.sourceImages.gallery[0];
    if (typeof img === 'string') return resolveImageUrl(img);
    if (img?.url) return resolveImageUrl(img.url);
  }

  return FALLBACK_IMAGE;
};

export default {
  resolveImageUrl,
  getAdminProductImage,
  handleImageError,
  FALLBACK_IMAGE,
};
