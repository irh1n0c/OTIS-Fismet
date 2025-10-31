// const mongoose = require('mongoose');
// const dotenv = require('dotenv');

// dotenv.config(); // Carga las variables del .env

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//       // 'useCreateIndex: true' ya no es necesario en Mongoose 6+
//     });
//     console.log('MongoDB Conectado Exitosamente. 🚀');
//   } catch (err) {
//     console.error('Error de conexión a MongoDB:', err.message);
//     // Salir del proceso con error
//     process.exit(1);
//   }
// };

// module.exports = connectDB;

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 1. IMPORTA TU MODELO AQUÍ
// (Asegúrate que el nombre 'MongoModelo' sea correcto)
const Reporte = require('../models/MongoModelo'); 

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
    const reportes = await Reporte.find(); 

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