const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
const { Upload } = require('@aws-sdk/lib-storage');
const crypto = require('crypto');

// Ensure environment variables from .env are loaded when this module initializes
dotenv.config();

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Debug helper: resolve and log credentials at runtime to help with troubleshooting
const debugResolvedCredentials = async () => {
  try {
    const provider = r2Client.config.credentials;
    const resolved = typeof provider === 'function' ? await provider() : provider;
    // Print a safe summary (avoid logging the full secret in production)
    if (!resolved) {
      console.error('R2 credential resolver returned falsy value:', resolved);
    } else {
      console.log('R2 resolved credentials:', {
        accessKeyId: resolved.accessKeyId || null,
        hasSecret: !!resolved.secretAccessKey,
        // sessionToken may be present for temporary credentials
        hasSessionToken: !!resolved.sessionToken,
      });
    }
  } catch (err) {
    console.error('Error resolving R2 credentials:', err);
  }
};

// Run once so tests like `node test-r2.js` show credential resolution info
debugResolvedCredentials();

/**
 * Sube una imagen a R2
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} filename - Nombre original del archivo
 * @param {string} mimetype - Tipo MIME del archivo
 * @returns {Promise<string>} URL pública de la imagen
 */
const uploadToR2 = async (fileBuffer, filename, mimetype, folder = '') => {
  try {
    // Generar nombre único
    const baseName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${filename}`;
    const uniqueName = folder ? `${folder.replace(/\/$/, '')}/${baseName}` : baseName;
    
    const upload = new Upload({
      client: r2Client,
      params: {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: uniqueName,
        Body: fileBuffer,
        ContentType: mimetype,
      },
    });

    await upload.done();
    
    // Construir URL pública
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${uniqueName}`;
    return publicUrl;
  } catch (error) {
    console.error('Error subiendo a R2:', error);
    throw new Error('Error al subir imagen a R2');
  }
};

/**
 * Elimina una imagen de R2
 * @param {string} imageUrl - URL completa de la imagen
 */
const deleteFromR2 = async (imageUrl) => {
  try {
    // Extraer el nombre del archivo de la URL
    const key = imageUrl.split('/').pop();
    
    await r2Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));
    
    console.log(`Imagen eliminada: ${key}`);
  } catch (error) {
    console.error('Error eliminando de R2:', error);
    throw new Error('Error al eliminar imagen de R2');
  }
};

/**
 * Lista todas las imágenes en R2
 */
const listR2Images = async () => {
  try {
    const response = await r2Client.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
    }));
    
    return response.Contents || [];
  } catch (error) {
    console.error('Error listando imágenes:', error);
    throw error;
  }
};

module.exports = { uploadToR2, deleteFromR2, listR2Images };