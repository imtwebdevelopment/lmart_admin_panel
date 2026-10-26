// Service to interact with the MongoDB Image Storage API

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Upload an image to MongoDB via server API
 * @param {File} file
 * @param {Object} options { productId, isMain, color, role }
 * @returns {Promise<{ url: string, id: string, name: string, path: string, type: string, isMain: boolean, color: string, role: string, storage: string }>}
 */
export const uploadImageToMongoDB = async (file, { productId = '', isMain = false, color = '', role = '' } = {}) => {
  const formData = new FormData();
  formData.append('image', file);
  if (productId) formData.append('productId', productId);
  formData.append('isMain', String(isMain));
  if (color) formData.append('color', color);
  if (role) formData.append('role', role);

  const response = await fetch(`${API_BASE}/images/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed with status ${response.status}`);
  }

  const result = await response.json();
  return {
    url: result.url,
    id: result.id,
    name: result.originalName || file.name,
    path: `mongodb://${result.id}`,
    type: 'mongodb',
    isMain: result.isMain,
    color: result.color,
    role: result.role || (productId ? 'product' : 'banner'),
    storage: 'mongodb',
  };
};

/**
 * Replace an image in MongoDB via server API
 * @param {string} imageId
 * @param {File} file
 * @param {Object} options { productId, isMain, color, role }
 * @returns {Promise<{ url: string, id: string, name: string, path: string, type: string, isMain: boolean, color: string, role: string, storage: string }>}
 */
export const replaceImageInMongoDB = async (imageId, file, { productId = '', isMain = false, color = '', role = '' } = {}) => {
  const formData = new FormData();
  formData.append('image', file);
  if (productId) formData.append('productId', productId);
  formData.append('isMain', String(isMain));
  if (color) formData.append('color', color);
  if (role) formData.append('role', role);

  const response = await fetch(`${API_BASE}/images/${imageId}`, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Image replacement failed with status ${response.status}`);
  }

  const result = await response.json();
  return {
    url: result.url,
    id: result.id,
    name: result.originalName || file.name,
    path: `mongodb://${result.id}`,
    type: 'mongodb',
    isMain: result.isMain,
    color: result.color,
    role: result.role || (productId ? 'product' : 'banner'),
    storage: 'mongodb',
  };
};

/**
 * Delete an image in MongoDB
 * @param {string} imageId
 */
export const deleteImageFromMongoDB = async (imageId) => {
  const response = await fetch(`${API_BASE}/images/${imageId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Delete failed with status ${response.status}`);
  }
  return response.json();
};

export default {
  uploadImageToMongoDB,
  replaceImageInMongoDB,
  deleteImageFromMongoDB,
};
