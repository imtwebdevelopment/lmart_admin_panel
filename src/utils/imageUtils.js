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

  const mongoUri = raw.match(/^mongodb:\/\/([0-9a-fA-F]{24})$/);
  if (mongoUri) return getMongoImageUrl(mongoUri[1]);

  if (/^[0-9a-fA-F]{24}$/.test(raw)) {
    return getMongoImageUrl(raw);
  }

  const imagePath = raw.match(/(?:^|\/)api\/images\/([0-9a-fA-F]{24})(?:[?#].*)?$/);
  if (imagePath) return getMongoImageUrl(imagePath[1]);

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const legacyUrl = new URL(raw);
      const isLoopback = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(legacyUrl.hostname);
      const legacyImageId = legacyUrl.pathname.match(/^\/api\/images\/([0-9a-fA-F]{24})$/);
      if (isLoopback && legacyImageId) return getMongoImageUrl(legacyImageId[1]);
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
