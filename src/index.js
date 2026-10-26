/**
 * File: functions/index.js
 * Firebase Cloud Function for Product Image Processing
 * * Dependencies:
 * npm install sharp axios firebase-admin firebase-functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const sharp = require('sharp'); // For image manipulation (resizing/conversion)

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

// Define image sizes for optimization (WebP format is used for efficiency)
const IMAGE_SIZES = [
    { size: 1200, suffix: 'large' },
    { size: 600, suffix: 'medium' },
    { size: 300, suffix: 'thumb' }
];

/**
 * Downloads an image from a URL, processes it, and stores it through the MongoDB image API.
 */
async function processAndUploadImage(imageUrl, imageMeta, productId) {
    if (!imageUrl || imageMeta.type !== 'external' || imageMeta.status !== 'pending') {
        return imageMeta; 
    }

    try {
        // 1. Download the image buffer
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000 
        });
        
        const originalBuffer = response.data;
        const newUrls = {};
        const imageIds = {};
        const apiBase = process.env.IMAGE_API_URL || process.env.VITE_API_URL;
        if (!apiBase) {
            throw new Error('IMAGE_API_URL must point to the MongoDB image backend API');
        }
        const imageApiBase = apiBase.replace(/\/+$/, '');

        // 2. Process and store each image size through the MongoDB image API.
        const uploadPromises = IMAGE_SIZES.map(async ({ size, suffix }) => {
            const resizedBuffer = await sharp(originalBuffer)
                .resize(size, size, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            const formData = new FormData();
            formData.append('image', new Blob([resizedBuffer], { type: 'image/webp' }), `${suffix}.webp`);
            formData.append('associatedRecordId', productId);
            formData.append('role', 'product-processed');
            formData.append('isMain', String(imageMeta.isMain === true && suffix === 'medium'));

            const uploadResponse = await fetch(`${imageApiBase}/images/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!uploadResponse.ok) {
                throw new Error(`MongoDB image upload failed (${uploadResponse.status}): ${await uploadResponse.text()}`);
            }

            const uploaded = await uploadResponse.json();
            newUrls[suffix] = `/api/images/${uploaded.id}`;
            imageIds[suffix] = uploaded.id;
        });

        await Promise.all(uploadPromises);

        // 3. Return updated metadata
        return {
            ...imageMeta,
            type: 'mongodb',
            url: newUrls.medium, 
            urls: newUrls, 
            imageIds,
            status: 'completed',
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        };

    } catch (error) {
        console.error(`Error processing image ${imageUrl}:`, error.message);
        
        // Mark image as failed
        return {
            ...imageMeta,
            status: 'failed',
            error: error.message,
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        };
    }
}


/**
 * Cloud Function Trigger: Fires when a new document is created in 'products' with imageProcessingStatus: 'pending'.
 */
exports.processProductImages = functions.firestore
    .document('products/{productId}')
    .onCreate(async (snap, context) => {
        const productId = context.params.productId;
        const productData = snap.data();

        // 1. Check the flag set by the client to see if processing is needed
        if (productData.imageProcessingStatus !== 'pending' || !productData.imageUrls || productData.imageUrls.length === 0) {
            return null;
        }

        console.log(`Starting image processing for product: ${productId}`);
        
        // 2. Process all image URLs concurrently
        const imageProcessingPromises = productData.imageUrls.map(imageMeta => 
            processAndUploadImage(imageMeta.url, imageMeta, productId)
        );

        const updatedImageUrls = await Promise.all(imageProcessingPromises);
        
        let newMainImageUrl = productData.mainImageUrl;
        let finalStatus = 'completed';

        // 3. Determine the final main image URL and product status
        const mainImageUpdate = updatedImageUrls.find(img => img.isMain && img.status === 'completed');
        
        if (mainImageUpdate && mainImageUpdate.urls) {
            // Set the main image to the medium-sized, processed URL
            newMainImageUrl = mainImageUpdate.urls.medium; 
        } else if (mainImageUpdate && mainImageUpdate.status === 'failed') {
            newMainImageUrl = null;
        }

        // Check if any image failed
        if (updatedImageUrls.some(img => img.status === 'failed')) {
            finalStatus = 'completed_with_errors';
        }

        // 4. Update the Firestore document with the new URLs and status
        await db.collection('products').doc(productId).update({
            imageUrls: updatedImageUrls,
            mainImageUrl: newMainImageUrl,
            imageProcessingStatus: finalStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Finished processing product: ${productId} with status: ${finalStatus}`);
        return null;
    });