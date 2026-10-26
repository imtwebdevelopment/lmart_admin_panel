// Service to interact with the MongoDB Image Storage API

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');

const getApiBase = () => {
  if (!API_BASE) {
    throw new Error('VITE_API_URL must be configured for the deployed image backend');
  }
  return API_BASE.replace(/\/$/, '');
};

const getStableImageUrl = (id) => `/api/images/${id}`;
export const isImageFile = (file) =>
  Boolean(file?.type?.startsWith('image/')) || /\.(jpe?g|png|webp|gif|svg)$/i.test(file?.name || '');

/**
 * Upload an image to MongoDB via server API
 * @param {File} file
 * @param {Object} options { productId, isMain, color, role }
 * @returns {Promise<{ url: string, id: string, name: string, path: string, type: string, isMain: boolean, color: string, role: string, storage: string }>}
 */
export const uploadImageToMongoDB = async (file, { productId = '', associatedRecordId = '', isMain = false, color = '', role = '' } = {}) => {
  const formData = new FormData();
  formData.append('image', file);
  if (productId) formData.append('productId', productId);
  if (associatedRecordId) formData.append('associatedRecordId', associatedRecordId);
  formData.append('isMain', String(isMain));
  if (color) formData.append('color', color);
  if (role) formData.append('role', role);

  const response = await fetch(`${getApiBase()}/images/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed with status ${response.status}`);
  }

  const result = await response.json();
  return {
    url: getStableImageUrl(result.id),
    id: result.id,
    name: result.originalName || file.name,
    contentType: result.contentType,
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
export const replaceImageInMongoDB = async (imageId, file, { productId = '', associatedRecordId = '', isMain = false, color = '', role = '' } = {}) => {
  const formData = new FormData();
  formData.append('image', file);
  if (productId) formData.append('productId', productId);
  if (associatedRecordId) formData.append('associatedRecordId', associatedRecordId);
  formData.append('isMain', String(isMain));
  if (color) formData.append('color', color);
  if (role) formData.append('role', role);

  const response = await fetch(`${getApiBase()}/images/${imageId}`, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Image replacement failed with status ${response.status}`);
  }

  const result = await response.json();
  return {
    url: getStableImageUrl(result.id),
    id: result.id,
    name: result.originalName || file.name,
    contentType: result.contentType,
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
  const response = await fetch(`${getApiBase()}/images/${imageId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Delete failed with status ${response.status}`);
  }
  return response.json();
};

export const getMongoImageId = (imageReference) => {
  if (typeof imageReference !== 'string') return null;
  const value = imageReference.trim();
  const mongoId = value.match(/^mongodb:\/\/([0-9a-fA-F]{24})$/);
  if (mongoId) return mongoId[1];
  const apiId = value.match(/\/api\/images\/([0-9a-fA-F]{24})(?:[?#].*)?$/);
  if (apiId) return apiId[1];
  return /^[0-9a-fA-F]{24}$/.test(value) ? value : null;
};

export const deleteMongoImageReference = async (imageReference) => {
  const imageId = getMongoImageId(imageReference);
  if (imageId) return deleteImageFromMongoDB(imageId);
  return null;
};

export default {
  uploadImageToMongoDB,
  replaceImageInMongoDB,
  deleteImageFromMongoDB,
  getMongoImageId,
  deleteMongoImageReference,
};
