
const express = require('express');
const router = express.Router();
const upload = require('../../config/cloudinary'); // 1. Importa el middleware de carga
const { crearReporte, obtenerReportes } = require('../../controllers/reporteController'); // 2. Importa los controladores
const multer = require('multer'); 

// 4. CREAMOS UN MANEJADOR DE ERRORES ESPECÍFICO
function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    // Un error conocido de Multer (ej: "archivo muy grande")
    console.error("ERROR DE MULTER:", err);
    return res.status(500).json({ msg: `Error de Multer: ${err.message}` });
  } else if (err) {
    // ¡ESTE ES EL ERROR QUE BUSCAMOS! (Probablemente de Cloudinary)
    console.error("¡ERROR ATRAPADO! (Cloudinary o Desconocido):", err);
    return res.status(500).json({ 
      msg: `Error al subir la imagen: ${err.message}`, 
      error_completo: err 
    });
  }
  
  next();
}

// @route   POST /api/reportes
// @desc    Crear un nuevo reporte
// @access  Public
router.post(
  '/', 
  // 5. MODIFICAMOS CÓMO SE LLAMA A 'upload.array'
  (req, res, next) => {
    
    upload.array('imagenesEquipo', 10)(req, res, (err) => {
      
      handleUploadErrors(err, req, res, next);
    });
  },
  
  crearReporte
);

router.get('/', obtenerReportes);

module.exports = router;