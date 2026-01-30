
const express = require('express');
const router = express.Router();
const upload = require('../../config/multer'); 
const { crearReporte, obtenerReportes, actualizarImagenesReporte, crearBloqueVacio } = require('../../controllers/reporteController');
const { actualizarEquipo, eliminarEquipo, obtenerEquipo, buscarEquipoPorCodigo } = require('../../controllers/equipoController');
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

// ==================== RUTAS DE EQUIPO (CRUD) ====================
// ⚠️ IMPORTANTE: Las rutas específicas DEBEN IR ANTES que las dinámicas

// @route   GET /api/reportes/buscar/:codigoEquipo
// @desc    Buscar un equipo por código
router.get('/buscar/:codigoEquipo', buscarEquipoPorCodigo);

// @route   POST /api/reportes/bloque
// @desc    Crear un bloque vacío
router.post('/bloque', crearBloqueVacio);

// @route   PATCH /api/reportes/imagenes
// @desc    Añadir más imágenes a un reporte existente
// @access  Public
router.patch(
  '/imagenes',
  upload.array('imagenesEquipo', 10), // Reutiliza el middleware de carga
  actualizarImagenesReporte // Llama a la nueva función del controlador
);

// ==================== RUTAS DINÁMICAS (deben ir al final) ====================

// @route   GET /api/reportes/:bloqueId/:reporteId
// @desc    Obtener un equipo específico
router.get('/:bloqueId/:reporteId', obtenerEquipo);

// @route   PATCH /api/reportes/:bloqueId/:reporteId
// @desc    Actualizar un equipo existente
router.patch('/:bloqueId/:reporteId', actualizarEquipo);

// @route   DELETE /api/reportes/:bloqueId/:reporteId
// @desc    Eliminar un equipo
router.delete('/:bloqueId/:reporteId', eliminarEquipo);

module.exports = router;