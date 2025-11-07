const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 1. IMPORTA TU MODELO AQUÍ
// (Asegúrate que el nombre 'MongoModelo' sea correcto)
const Bloque = require('../models/MongoModelo'); 

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // tus opciones de mongoose
    });
    console.log('MongoDB Conectado Exitosamente. 🚀');

    // --- 2. AÑADE TODO ESTE BLOQUE ---
    console.log('========================================');
    console.log('BUSCANDO REGISTROS EN LA BASE DE DATOS...');
    
    // Busca todos los documentos en la colección 'reportes'
    const reportes = await Bloque.find(); 

    if (reportes.length > 0) {
      console.log(`Se encontraron ${reportes.length} registros:`);
      // Imprime los registros en la consola
      console.log(JSON.stringify(reportes, null, 2)); 
    } else {
      console.log('No se encontraron registros.');
    }
    console.log('========================================');
    // --- FIN DEL BLOQUE A AÑADIR ---

  } catch (err) {
    console.error('Error de conexión a MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;