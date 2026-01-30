const Bloque = require('../models/MongoModelo');

/**
 * @desc    Actualizar los campos de un reporte existente
 * @route   PATCH /api/equipos/:bloqueId/:reporteId
 * @access  Public
 */
exports.actualizarEquipo = async (req, res) => {
  try {
    const { bloqueId, reporteId } = req.params;
    const { codigoEquipo, metrologo, observaciones, fecha, imagenesAEliminar } = req.body;

    // Validar que exista el bloque
    const bloque = await Bloque.findById(bloqueId);
    if (!bloque) {
      return res.status(404).json({ msg: 'Bloque no encontrado' });
    }

    // Encontrar el reporte dentro del bloque
    const reporte = bloque.reportes.id(reporteId);
    if (!reporte) {
      return res.status(404).json({ msg: 'Equipo no encontrado' });
    }

    // Validar que el nuevo código de equipo no exista en otro reporte
    if (codigoEquipo && codigoEquipo !== reporte.codigoEquipo) {
      const codigoExistente = await Bloque.findOne({
        "reportes.codigoEquipo": codigoEquipo
      });
      if (codigoExistente) {
        return res.status(400).json({
          msg: `El código de equipo '${codigoEquipo}' ya existe en otro reporte`
        });
      }
    }

    // Actualizar los campos
    if (codigoEquipo) reporte.codigoEquipo = codigoEquipo;
    if (metrologo) reporte.metrologo = metrologo;
    if (observaciones !== undefined) reporte.observaciones = observaciones;
    if (fecha) reporte.fecha = new Date(fecha);

    // Eliminar imágenes si es necesario
    if (imagenesAEliminar && Array.isArray(imagenesAEliminar) && imagenesAEliminar.length > 0) {
      const { deleteFromR2 } = require('../config/r2.js');
      
      // Eliminar de R2
      await Promise.all(
        imagenesAEliminar.map(publicId => deleteFromR2(publicId, 'reportes-otis'))
      );

      // Eliminar del array de imágenes
      reporte.imagenesEquipo = reporte.imagenesEquipo.filter(
        img => !imagenesAEliminar.includes(img.public_id)
      );
    }

    // Guardar el bloque actualizado
    const bloqueActualizado = await bloque.save();

    res.status(200).json({
      msg: 'Equipo actualizado correctamente',
      bloque: bloqueActualizado
    });
  } catch (err) {
    console.error('Error al actualizar equipo:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ msg: messages.join(', ') });
    }
    res.status(500).json({ msg: 'Error del servidor' });
  }
};

/**
 * @desc    Eliminar un reporte (equipo)
 * @route   DELETE /api/equipos/:bloqueId/:reporteId
 * @access  Public
 */
exports.eliminarEquipo = async (req, res) => {
  try {
    const { bloqueId, reporteId } = req.params;

    // Validar que exista el bloque
    const bloque = await Bloque.findById(bloqueId);
    if (!bloque) {
      return res.status(404).json({ msg: 'Bloque no encontrado' });
    }

    // Encontrar el reporte dentro del bloque
    const reporte = bloque.reportes.id(reporteId);
    if (!reporte) {
      return res.status(404).json({ msg: 'Equipo no encontrado' });
    }

    // Eliminar las imágenes de R2 (opcional, pero recomendado)
    if (reporte.imagenesEquipo && reporte.imagenesEquipo.length > 0) {
      const { deleteFromR2 } = require('../config/r2.js');
      await Promise.all(
        reporte.imagenesEquipo.map(img => deleteFromR2(img.public_id, 'reportes-otis'))
      );
    }

    // Eliminar el reporte del array
    bloque.reportes.id(reporteId).deleteOne();

    // Guardar el bloque actualizado
    const bloqueActualizado = await bloque.save();

    res.status(200).json({
      msg: 'Equipo eliminado correctamente',
      bloque: bloqueActualizado
    });
  } catch (err) {
    console.error('Error al eliminar equipo:', err);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};

/**
 * @desc    Obtener un reporte específico
 * @route   GET /api/equipos/:bloqueId/:reporteId
 * @access  Public
 */
exports.obtenerEquipo = async (req, res) => {
  try {
    const { bloqueId, reporteId } = req.params;

    const bloque = await Bloque.findById(bloqueId);
    if (!bloque) {
      return res.status(404).json({ msg: 'Bloque no encontrado' });
    }

    const reporte = bloque.reportes.id(reporteId);
    if (!reporte) {
      return res.status(404).json({ msg: 'Equipo no encontrado' });
    }

    res.status(200).json({
      msg: 'Equipo obtenido correctamente',
      reporte
    });
  } catch (err) {
    console.error('Error al obtener equipo:', err);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};

/**
 * @desc    Buscar un equipo por código
 * @route   GET /api/equipos/buscar/:codigoEquipo
 * @access  Public
 */
exports.buscarEquipoPorCodigo = async (req, res) => {
  try {
    const { codigoEquipo } = req.params;

    const bloque = await Bloque.findOne({
      "reportes.codigoEquipo": codigoEquipo
    });

    if (!bloque) {
      return res.status(404).json({ msg: 'Equipo no encontrado' });
    }

    const reporte = bloque.reportes.find(r => r.codigoEquipo === codigoEquipo);

    res.status(200).json({
      msg: 'Equipo encontrado',
      bloque,
      reporte
    });
  } catch (err) {
    console.error('Error al buscar equipo:', err);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};
