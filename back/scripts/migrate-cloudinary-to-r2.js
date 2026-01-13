/*
  Script: migrate-cloudinary-to-r2.js
  Usage: node migrate-cloudinary-to-r2.js

  Copies images referenced in MongoDB (Cloudinary URLs) to Cloudflare R2
  and updates the `url` and `public_id` fields in-place.

  Requirements: set .env with MONGO_URI and R2_* values (already present).
*/

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('../config/db');
const Bloque = require('../models/MongoModelo');

// Helper: download URL to Buffer
function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    try {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // follow redirect
          return resolve(downloadToBuffer(res.headers.location));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to fetch ${url} - Status ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

// Get filename from Cloudinary URL or public_id
function getFilenameFrom(url, publicId) {
  try {
    const parsed = new URL(url);
    const base = path.basename(parsed.pathname);
    if (base && base.indexOf('.') !== -1) return base;
  } catch (e) {}
  // fallback to publicId + .jpg
  return publicId ? `${publicId}.jpg` : `img-${Date.now()}.jpg`;
}

async function run() {
  console.log('Conectando a MongoDB...');
  await connectDB();

  const r2mod = await import('../config/r2.js');
  const uploadToR2 = r2mod.uploadToR2;

  console.log('Buscando documentos en MongoDB...');
  const bloques = await Bloque.find();
  console.log(`Se encontraron ${bloques.length} bloques.`);

  let total = 0;
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const bloque of bloques) {
    let changed = false;
    for (const reporte of bloque.reportes) {
      for (const img of reporte.imagenesEquipo) {
        total++;
        try {
          // Skip if already points to R2
          if (img.url && img.url.startsWith(process.env.R2_PUBLIC_URL)) {
            skipped++;
            continue;
          }

          console.log(`Descargando: ${img.url}`);
          const buf = await downloadToBuffer(img.url);
          const filename = getFilenameFrom(img.url, img.public_id);
          console.log(`Subiendo a R2: ${filename}`);
          const newUrl = await uploadToR2(buf, filename, 'application/octet-stream', 'reportes-otis');

          // Update fields
          img.url = newUrl;
          img.public_id = newUrl.split('/').pop();
          changed = true;
          migrated++;
          console.log(`Migrado -> ${newUrl}`);
        } catch (err) {
          errors++;
          console.error(`Error migrando imagen ${img.url}:`, err.message || err);
        }
      }
    }
    if (changed) {
      try {
        await bloque.save();
        console.log(`Documento ${bloque._id} actualizado.`);
      } catch (err) {
        console.error(`Error guardando bloque ${bloque._id}:`, err.message || err);
      }
    }
  }

  console.log('--- Resumen ---');
  console.log(`Total imágenes inspeccionadas: ${total}`);
  console.log(`Migradas: ${migrated}`);
  console.log(`Omitidas (ya en R2): ${skipped}`);
  console.log(`Errores: ${errors}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error en migración:', err);
  process.exit(1);
});
