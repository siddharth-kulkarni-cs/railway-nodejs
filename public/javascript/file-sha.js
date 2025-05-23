/**
 * Calculates multiple SHA hashes of a file
 * @param {File} file - The file to calculate hashes for
 * @returns {Promise<Object>} - A promise that resolves to an object with different hash types
 */
async function calculateMultipleSHA(file) {
    try {
        // Read the file as an ArrayBuffer
        const buffer = await file.arrayBuffer();
        
        // Calculate different SHA algorithms
        const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
        const hashes = {};
        
        for (const algorithm of algorithms) {
            const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            hashes[algorithm] = hashHex;
        }
        
        return hashes;
    } catch (error) {
        console.error('Error calculating file hashes:', error);
        throw error;
    }
}

/**
 * Extracts metadata from a file
 * @param {File} file - The file to extract metadata from
 * @returns {Promise<Object>} - A promise that resolves to metadata object
 */
async function extractFileMetadata(file) {
    const metadata = {
        name: file.name,
        size: file.size,
        type: file.type || 'Unknown',
        lastModified: new Date(file.lastModified),
        extension: file.name.split('.').pop().toLowerCase(),
        sizeFormatted: formatFileSize(file.size)
    };
    
    // Try to extract additional metadata for images
    if (file.type.startsWith('image/')) {
        try {
            const imageMetadata = await getImageMetadata(file);
            metadata.image = imageMetadata;
        } catch (error) {
            console.warn('Could not extract image metadata:', error);
        }
    }
    
    return metadata;
}

/**
 * Gets image dimensions and basic properties
 * @param {File} file - Image file
 * @returns {Promise<Object>} - Image metadata
 */
function getImageMetadata(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = function() {
            const metadata = {
                width: this.naturalWidth,
                height: this.naturalHeight,
                aspectRatio: (this.naturalWidth / this.naturalHeight).toFixed(2)
            };
            URL.revokeObjectURL(url);
            resolve(metadata);
        };
        
        img.onerror = function() {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        
        img.src = url;
    });
}

/**
 * Formats file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size string
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Legacy function for backward compatibility
async function calculateFileSHA(file) {
    const hashes = await calculateMultipleSHA(file);
    return hashes['SHA-256'];
}

// Example usage:
// const fileInput = document.querySelector('input[type="file"]');
// fileInput.addEventListener('change', async (event) => {
//     const file = event.target.files[0];
//     if (file) {
//         try {
//             const hashes = await calculateMultipleSHA(file);
//             const metadata = await extractFileMetadata(file);
//             console.log('File hashes:', hashes);
//             console.log('File metadata:', metadata);
//         } catch (error) {
//             console.error('Failed to process file:', error);
//         }
//     }
// });
