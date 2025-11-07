const Bloque = require('../models/MongoModelo');

/**
 * @desc    Crear un nuevo reporte
 * @route   POST /api/reportes
 * @access  Public (por ahora)
 */
exports.crearReporte = async (req, res) => {
  try {
    // 1. Los datos de texto vienen en 'req.body'
    const { departamento, nombreCliente, metrologo, codigoEquipo } = req.body;

    // 2. Los archivos subidos a Cloudinary vienen en 'req.files' (como un array)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: 'No se subieron imágenes.' });
    }

    // 3. Formateamos las imágenes al formato de nuestro Schema
    const imagenesParaGuardar = req.files.map(file => ({
      url: file.path,       // URL segura de Cloudinary
      public_id: file.filename // ID público de Cloudinary
    }));

    // 4. Creamos el nuevo reporte usando el Modelo
    const nuevoReporte ={
      departamento,
      nombreCliente,
      metrologo,
      codigoEquipo,
      imagenesEquipo: imagenesParaGuardar
      // 'fecha' y 'timestamps' se agregan automáticamente
    };
    const bloqueActualizado = await Bloque.findOneAndUpdate(
      { departamento, nombreCliente },
      { $push: { reportes: nuevoReporte } },
      { new: true, upsert: true } // Crea el bloque si no existe
    );

    // 6. Enviamos respuesta de éxito
    res.status(201).json({ 
      msg: 'Reporte creado exitosamente', 
      reporte: bloqueActualizado
    });
  } catch (err) {
    console.error("EL ERROR COMPLETO DEL BACKEND ES:", err);
    
    // Error de código duplicado
    if (err.code === 11000) {
      // Revisa si el error es del 'codigoEquipo' (dentro del array)
      if (err.keyPattern && err.keyPattern['reportes.codigoEquipo']) {
         return res.status(400).json({ msg: `Error: El código de equipo '${codigoEquipo}' ya existe.` });
      }
      // Revisa si el error es del 'departamento/clinica' (del bloque)
      if (err.keyPattern && err.keyPattern.departamento) {
         return res.status(400).json({ msg: `Error: El bloque para '${departamento}' y '${nombreCliente}' ya existe (error de índice).` });
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
    const bloques = await Bloque.find().sort({ updatedAt: -1 }); // Del más nuevo al más viejo
    res.json(bloques);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del Servidor');
  }
};