
const express = require('express');
const router = express.Router();
const upload = require('../../config/multer'); 
const { crearReporte, obtenerReportes, actualizarImagenesReporte, crearBloqueVacio, obtenerBloquesRecientes } = require('../../controllers/reporteController');
const { actualizarEquipo, eliminarEquipo, obtenerEquipo, buscarEquipoPorCodigo } = require('../../controllers/equipoController');
const multer = require('multer'); 

// 4. CREAMOS UN MANEJADOR DE ERRORES ESPECÍFICO
function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    console.error("ERROR DE MULTER:", err);
    let msg = `Error de Multer: ${err.message}`;
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      msg = `Se ha superado el límite de imágenes permitidas (máximo 100) o el campo de subida no es válido (${err.field || 'imagenesEquipo'}).`;
    } else if (err.code === 'LIMIT_FILE_SIZE') {
      msg = 'Una o más imágenes superan el tamaño máximo permitido.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      msg = 'Se enviaron demasiados archivos a la vez.';
    }
    return res.status(400).json({ msg });
  } else if (err) {
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
  // 5. MODIFICAMOS CÓMO SE LLAMA A 'upload.array' (límite ampliado a 100 imágenes)
  (req, res, next) => {
    upload.array('imagenesEquipo', 100)(req, res, (err) => {
      handleUploadErrors(err, req, res, next);
    });
  },
  
  crearReporte
);

router.get('/', obtenerReportes);

// @route   GET /api/reportes/recientes
// @desc    Obtener los últimos bloques creados (por defecto 5)
router.get('/recientes', obtenerBloquesRecientes);

// ==================== ENDPOINT DE DIAGNÓSTICO ====================
// Este endpoint ayuda a verificar si la ruta /imagenes existe
router.get('/health/imagenes', (req, res) => {
  res.json({ msg: '✓ Ruta PATCH /api/reportes/imagenes está registrada correctamente', timestamp: new Date() });
});

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
  (req, res, next) => {
    console.log('✓ PATCH /imagenes - Iniciando middleware de multer');
    upload.array('imagenesEquipo', 100)(req, res, (err) => {
      console.log('✓ Multer completó. req.files:', req.files ? `${req.files.length} archivos` : 'undefined');
      handleUploadErrors(err, req, res, next);
    });
  },
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