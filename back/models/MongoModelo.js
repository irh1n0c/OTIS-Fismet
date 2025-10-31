const mongoose = require('mongoose');

const ReporteSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    default: Date.now
  },
  departamento: {
    type: String,
    required: [true, 'El departamento es obligatorio'],
    trim: true
  },
  nombreCliente: {
    type: String,
    required: [true, 'El nombre del cliente es obligatorio'],
    trim: true
  },
  metrologo: {
    type: String,
    required: [true, 'El nombre del metrólogo es obligatorio'],
    trim: true
  },
  codigoEquipo: {
    type: String,
    required: [true, 'El código de equipo es obligatorio'],
    trim: true,
    unique: true 
  },
  imagenesEquipo: [ 
    {
      url: {
        type: String,
        required: true
      },
      public_id: { // El ID de Cloudinary para poder borrarla si es necesario
        type: String,
        required: true
      }
    }
  ]
}, {
  // Esto agrega automáticamente 'createdAt' y 'updatedAt'
  timestamps: true 
});


module.exports = mongoose.model('Reporte', ReporteSchema);