const Bloque = require('../models/MongoModelo');

const obtenerNombreClienteNormalizado = (valor) => {
  const nombreBase = String(valor || '').trim();
  const anioVigente = new Date().getFullYear();

  if (!nombreBase) {
    return '';
  }

  if (nombreBase.endsWith(`-${anioVigente}`)) {
    return nombreBase;
  }

  const partes = nombreBase.split('-');
  const ultimaParte = partes[partes.length - 1];

  if (partes.length >= 3 && /^\d{4}$/.test(ultimaParte)) {
    return `${partes.slice(0, -1).join('-')}-${anioVigente}`;
  }

  return `${nombreBase}-${anioVigente}`;
};

/**
 * @desc    Crear un nuevo reporte
 * @route   POST /api/reportes
 * @access  Public (por ahora)
 */
exports.crearReporte = async (req, res) => {
  let nombreCliente;
  let codigoEquipo;

  try {
    console.log("========== INICIANDO crearReporte ==========");
    console.log("Metodo HTTP:", req.method);
    console.log("Ruta:", req.path || req.url);
    console.log("BODY COMPLETO:", req.body);
    console.log("observaciones:", req.body.observaciones);

    ({ nombreCliente, codigoEquipo } = req.body);
    const { metrologo, observaciones } = req.body;
    nombreCliente = obtenerNombreClienteNormalizado(nombreCliente);
    const departamento = null;

    const reporteExistente = await Bloque.findOne({ "reportes.codigoEquipo": codigoEquipo });
    if (reporteExistente) {
      return res.status(400).json({
        msg: `Error: El codigo de equipo '${codigoEquipo}' ya existe en el bloque del cliente '${reporteExistente.nombreCliente}'.`
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: 'No se subieron imagenes.' });
    }

    const { uploadToR2 } = require('../config/r2.js');
    const folder = 'reportes-otis';
    const uploadedUrls = await Promise.all(
      req.files.map(file => uploadToR2(file.buffer, file.originalname, file.mimetype, folder))
    );

    const imagenesParaGuardar = uploadedUrls.map(url => ({
      url,
      public_id: url.split('/').pop()
    }));

    const nuevoReporte = {
      metrologo,
      codigoEquipo,
      observaciones: observaciones || '',
      imagenesEquipo: imagenesParaGuardar
    };

    const bloqueActualizado = await Bloque.findOneAndUpdate(
      { nombreCliente },
      {
        $setOnInsert: { nombreCliente, departamento },
        $push: { reportes: nuevoReporte }
      },
      { new: true, upsert: true }
    );

    res.status(201).json({
      msg: 'Reporte creado exitosamente',
      reporte: bloqueActualizado
    });
  } catch (err) {
    console.error("EL ERROR COMPLETO DEL BACKEND ES:", err);

    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern['reportes.codigoEquipo']) {
        return res.status(400).json({ msg: `Error: El codigo de equipo '${codigoEquipo}' ya existe.` });
      }
      if (err.keyPattern && err.keyPattern.nombreCliente) {
        return res.status(400).json({ msg: `Error: El cliente '${nombreCliente}' ya existe.` });
      }
    }

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ msg: messages.join(', ') });
    }

    res.status(500).send('Error del Servidor');
  }
};

/**
 * @desc    Obtener reportes, opcionalmente paginados
 * @route   GET /api/reportes
 * @access  Public (para el admin)
 */
exports.obtenerReportes = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10);
    const limit = Number.parseInt(req.query.limit, 10);
    const paginar = Number.isInteger(page) && page > 0 && Number.isInteger(limit) && limit > 0;

    if (!paginar) {
      const bloques = await Bloque.find().sort({ updatedAt: -1 });
      return res.json(bloques);
    }

    const total = await Bloque.countDocuments();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const currentPage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const skip = (currentPage - 1) * limit;

    const bloques = await Bloque.find()
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: bloques,
      pagination: {
        total,
        page: currentPage,
        limit,
        pages: totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del Servidor');
  }
};

/**
 * @desc    Actualizar imagenes de un reporte (agregar nuevas y/o eliminar existentes)
 * @route   PATCH /api/reportes/imagenes
 * @access  Public
 */
exports.actualizarImagenesReporte = async (req, res) => {
  try {
    console.log('========== INICIANDO actualizarImagenesReporte ==========');
    console.log('req.method:', req.method);
    console.log('req.path:', req.path);
    console.log('req.url:', req.url);
    console.log('req.files:', req.files ? `${req.files.length} archivos` : 'undefined');
    console.log('req.body:', req.body);

    const { codigoEquipo } = req.body;

    let imagenesAEliminar = [];
    if (req.body.imagenesAEliminar) {
      imagenesAEliminar = Array.isArray(req.body.imagenesAEliminar)
        ? req.body.imagenesAEliminar
        : [req.body.imagenesAEliminar];
    }

    console.log('imagenesAEliminar:', imagenesAEliminar);
    console.log('codigoEquipo:', codigoEquipo);

    const { uploadToR2, deleteFromR2 } = require('../config/r2.js');
    const folder = 'reportes-otis';

    if (imagenesAEliminar.length > 0) {
      console.log('Imagenes a eliminar:', imagenesAEliminar);

      const bloque = await Bloque.findOne({ "reportes.codigoEquipo": codigoEquipo });
      if (bloque) {
        const reporte = bloque.reportes.find(r => r.codigoEquipo === codigoEquipo);
        if (reporte && reporte.imagenesEquipo.length > 0) {
          const imagenesAEliminarObjetos = reporte.imagenesEquipo.filter(img =>
            imagenesAEliminar.includes(img.public_id)
          );

          console.log(`Encontradas ${imagenesAEliminarObjetos.length} imagenes para eliminar`);

          const resultadosEliminacion = [];
          for (const imagen of imagenesAEliminarObjetos) {
            try {
              await deleteFromR2(imagen.url);
              console.log(`Eliminada de R2: ${imagen.public_id}`);
              resultadosEliminacion.push({ public_id: imagen.public_id, success: true });
            } catch (deleteError) {
              console.error(`Error al eliminar de R2: ${imagen.public_id} - ${deleteError.message}`);
              resultadosEliminacion.push({ public_id: imagen.public_id, success: false, error: deleteError.message });
            }
          }

          const fallos = resultadosEliminacion.filter(r => !r.success);
          if (fallos.length > 0) {
            console.warn(`Fallos en eliminacion de R2: ${fallos.length} de ${resultadosEliminacion.length}`);
          }

          await Bloque.findOneAndUpdate(
            { "reportes.codigoEquipo": codigoEquipo },
            {
              $pull: {
                "reportes.$.imagenesEquipo": {
                  public_id: { $in: imagenesAEliminar }
                }
              }
            },
            { new: true }
          );
          console.log('Imagenes eliminadas de MongoDB');
        }
      }
    }

    let bloqueActualizado = null;
    if (req.files && req.files.length > 0) {
      console.log(`Procesando ${req.files.length} nuevas imagenes...`);

      const uploadedUrls = await Promise.all(
        req.files.map(file => uploadToR2(file.buffer, file.originalname, file.mimetype, folder))
      );

      const imagenesParaGuardar = uploadedUrls.map(url => ({
        url,
        public_id: url.split('/').pop()
      }));

      bloqueActualizado = await Bloque.findOneAndUpdate(
        { "reportes.codigoEquipo": codigoEquipo },
        {
          $push: {
            "reportes.$.imagenesEquipo": { $each: imagenesParaGuardar }
          }
        },
        { new: true }
      );
      console.log(`${imagenesParaGuardar.length} nuevas imagenes agregadas`);
    } else {
      bloqueActualizado = await Bloque.findOne({ "reportes.codigoEquipo": codigoEquipo });
    }

    if (!bloqueActualizado) {
      return res.status(404).json({ msg: `No se encontro ningun reporte con el codigo ${codigoEquipo}.` });
    }

    res.status(200).json({
      msg: 'Imagenes actualizadas exitosamente',
      bloque: bloqueActualizado
    });
  } catch (err) {
    console.error("EL ERROR COMPLETO DEL BACKEND ES:", err);
    res.status(500).json({ msg: 'Error del Servidor', error: err.message });
  }
};

/**
 * @desc    Crear un bloque nuevo (sin reportes iniciales)
 * @route   POST /api/reportes/bloque
 * @access  Public
 */
exports.crearBloqueVacio = async (req, res) => {
  try {
    let { nombreCliente } = req.body;
    const departamento = null;
    nombreCliente = obtenerNombreClienteNormalizado(nombreCliente);

    if (!nombreCliente) {
      return res.status(400).json({ msg: 'Cliente es obligatorio.' });
    }

    let bloque = await Bloque.findOne({ nombreCliente });
    if (bloque) {
      return res.status(400).json({
        msg: `El bloque del cliente '${nombreCliente}' ya existe.`
      });
    }

    bloque = new Bloque({
      departamento,
      nombreCliente,
      reportes: []
    });

    await bloque.save();

    res.status(201).json({
      msg: 'Bloque creado exitosamente',
      bloque
    });
  } catch (err) {
    console.error("Error creando bloque:", err);
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Este cliente ya existe.' });
    }
    res.status(500).send('Error del Servidor');
  }
};
