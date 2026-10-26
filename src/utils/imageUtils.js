/**
 * Utility functions for resolving product images in Admin panel.
 * Handles both legacy Firebase Storage URLs and new MongoDB-stored images.
 */

export const FALLBACK_IMAGE = '/no-image.svg';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    raw = (img.url || img.src || '').trim();
  }

  if (!raw) return FALLBACK_IMAGE;

  if (raw.startsWith('mongodb://')) {
    const id = raw.replace('mongodb://', '');
    return `${API_BASE}/images/${id}`;
  }

  if (/^[0-9a-fA-F]{24}$/.test(raw)) {
    return `${API_BASE}/images/${raw}`;
  }

  if (raw.startsWith('/api/images')) {
    const host = API_BASE.replace(/\/api\/?$/, '');
    return `${host}${raw}`;
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
