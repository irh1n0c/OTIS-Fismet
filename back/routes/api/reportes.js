
const express = require('express');
const router = express.Router();
const upload = require('../../config/cloudinary'); 
const { crearReporte, obtenerReportes, actualizarImagenesReporte, crearBloqueVacio } = require('../../controllers/reporteController');
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

// @route   PATCH /api/reportes/imagenes
// @desc    Añadir más imágenes a un reporte existente
// @access  Public
router.patch(
  '/imagenes',
  upload.array('imagenesEquipo', 10), // Reutiliza el middleware de carga
  actualizarImagenesReporte // Llama a la nueva función del controlador
);

router.post('/bloque', crearBloqueVacio);
module.exports = router;