const Bloque = require('../models/MongoModelo');

/**
 * @desc    Crear un nuevo reporte
 * @route   POST /api/reportes
 * @access  Public (por ahora)
 */
exports.crearReporte = async (req, res) => {
  try {
    // 1. Los datos de texto vienen en 'req.body'
    const { departamento, nombreCliente, metrologo, codigoEquipo } = req.body;

    // --- ¡NUEVO! VALIDACIÓN PROACTIVA ---
    // 2. Verificamos si este codigoEquipo ya existe en CUALQUIER bloque
    const reporteExistente = await Bloque.findOne({ "reportes.codigoEquipo": codigoEquipo });

    if (reporteExistente) {
      // Si existe, detenemos todo y enviamos un error claro
      return res.status(400).json({
        msg: `Error: El código de equipo '${codigoEquipo}' ya existe en el bloque del cliente '${reporteExistente.nombreCliente}'.`
      });
    }
    // --- FIN DE LA VALIDACIÓN ---

    // 3. Los archivos subidos vienen en 'req.files' (como un array) - ahora en memoria
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: 'No se subieron imágenes.' });
    }

    // 4. Subir cada archivo a R2 y formatear las entradas para el Schema
    const { uploadToR2 } = await import('../config/r2.js');
    const folder = 'reportes-otis';
    const uploadedUrls = await Promise.all(
      req.files.map(file => uploadToR2(file.buffer, file.originalname, file.mimetype, folder))
    );

    const imagenesParaGuardar = uploadedUrls.map(url => ({
      url,
      public_id: url.split('/').pop()
    }));

    // 5. Creamos el objeto del nuevo reporte individual
    const nuevoReporte = {
      metrologo,
      codigoEquipo,
      imagenesEquipo: imagenesParaGuardar
    };

    // 6. Añadimos el reporte al bloque correspondiente
    const bloqueActualizado = await Bloque.findOneAndUpdate(
      { departamento, nombreCliente },
      { $push: { reportes: nuevoReporte } },
      { new: true, upsert: true } // Crea el bloque si no existe
    );

    // 7. Enviamos respuesta de éxito
    res.status(201).json({
      msg: 'Reporte creado exitosamente',
      reporte: bloqueActualizado
    });

  } catch (err) {
    console.error("EL ERROR COMPLETO DEL BACKEND ES:", err);

    // CAPA 2: "RED DE SEGURIDAD" (El policía reactivo)
    // Esto solo se activará si dos usuarios envían el mismo código al mismo tiempo.
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern['reportes.codigoEquipo']) {
        return res.status(400).json({ msg: `Error: El código de equipo '${codigoEquipo}' ya existe.` });
      }
      if (err.keyPattern && err.keyPattern.departamento) {
        return res.status(400).json({ msg: `Error: El bloque para '${departamento}' y '${nombreCliente}' ya existe.` });
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
 * @desc    Obtener todos los reportes
 * @route   GET /api/reportes
 * @access  Public (para el admin)
 */
exports.obtenerReportes = async (req, res) => {
  try {

    // 1. Usamos 'aggregate' en lugar de 'find'
    const bloques = await Bloque.aggregate([
      // Paso 1: Ordenar los BLOQUES principales (el más reciente primero)
      // (Basado en cuándo se añadió el último reporte)
      { $sort: { updatedAt: -1 } },

      // Paso 2: "Desenrollar" el array de reportes
      // Esto trata a cada reporte como un documento separado temporalmente
      { 
        $unwind: {
          path: "$reportes",
          preserveNullAndEmptyArrays: true // Mantener bloques sin reportes
        } 
      },

      // Paso 3: Ordenar los REPORTES INDIVIDUALES (el más reciente primero)
      { $sort: { "reportes.fecha": -1 } },

      // Paso 4: "Volver a enrollar" (agrupar) los reportes en sus bloques
      {
        $group: {
          _id: "$_id", // Agrupar por el ID original del Bloque
          departamento: { $first: "$departamento" },
          nombreCliente: { $first: "$nombreCliente" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          // $push vuelve a meter los reportes (ahora ordenados) en el array
          reportes: { $push: "$reportes" }
        }
      },

      // Paso 5: Volver a ordenar los BLOQUES (ya que $group desordena)
      { $sort: { updatedAt: -1 } }
    ]);

    res.json(bloques);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del Servidor');
  }
};

/**
 * @desc    Añadir más imágenes a un reporte existente
 * @route   PATCH /api/reportes/imagenes
 * @access  Public
 */
exports.actualizarImagenesReporte = async (req, res) => {
  try {
    const { codigoEquipo } = req.body; // El código para encontrar el reporte

    // 1. Validar que las imágenes llegaron
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: 'No se subieron imágenes.' });
    }

    // 2. Subir las nuevas imágenes a R2 y formatear para guardar
    const { uploadToR2 } = await import('../config/r2.js');
    const folder = 'reportes-otis';
    const uploadedUrls = await Promise.all(
      req.files.map(file => uploadToR2(file.buffer, file.originalname, file.mimetype, folder))
    );

    const imagenesParaGuardar = uploadedUrls.map(url => ({
      url,
      public_id: url.split('/').pop()
    }));

    // 3. ¡La Magia de Mongoose!
    // Encontramos el Bloque que contiene el reporte con 'codigoEquipo'
    const bloqueActualizado = await Bloque.findOneAndUpdate(
      { "reportes.codigoEquipo": codigoEquipo }, // Filtro: Encuentra el bloque
      {
        // $push: Añade elementos a un array
        // "reportes.$.imagenesEquipo": El '$' (operador posicional)
        // se asegura de añadir las imágenes SÓLO al reporte que coincidió
        $push: {
          "reportes.$.imagenesEquipo": { $each: imagenesParaGuardar }
        }
      },
      { new: true } // Devuelve el documento actualizado
    );

    if (!bloqueActualizado) {
      return res.status(404).json({ msg: `No se encontró ningún reporte con el código ${codigoEquipo}.` });
    }

    res.status(200).json({
      msg: 'Imágenes añadidas exitosamente',
      bloque: bloqueActualizado
    });

  } catch (err) {
    console.error("EL ERROR COMPLETO DEL BACKEND ES:", err);
    res.status(500).send('Error del Servidor');
  }
};

/**
 * @desc    Crear un bloque nuevo (sin reportes iniciales)
 * @route   POST /api/reportes/bloque
 * @access  Public
 */
exports.crearBloqueVacio = async (req, res) => {
  try {
    const { departamento, nombreCliente } = req.body;

    // 1. Validar campos
    if (!departamento || !nombreCliente) {
      return res.status(400).json({ msg: 'Departamento y Cliente son obligatorios.' });
    }

    // 2. Verificar si ya existe
    let bloque = await Bloque.findOne({ departamento, nombreCliente });
    
    if (bloque) {
      // Si ya existe, simplemente lo devolvemos (no es un error fatal, solo avisamos)
      return res.status(200).json({ 
        msg: 'El bloque ya existía. Seleccionado correctamente.', 
        bloque 
      });
    }

    // 3. Crear nuevo bloque
    bloque = new Bloque({
      departamento,
      nombreCliente,
      reportes: [] // Array vacío
    });

    await bloque.save();

    res.status(201).json({ 
      msg: 'Bloque creado exitosamente', 
      bloque 
    });

  } catch (err) {
    console.error("Error creando bloque:", err);
    // Capturar error de duplicado (por si acaso)
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Este bloque ya existe.' });
    }
    res.status(500).send('Error del Servidor');
  }
};