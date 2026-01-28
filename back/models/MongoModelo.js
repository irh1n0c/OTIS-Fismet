const mongoose = require('mongoose');

const ReporteIndividualSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    default: Date.now
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
    //unique: true 
  },
  observaciones: {
    type: String,
    default: '' 
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
});

const BloqueSchema = new mongoose.Schema({
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
  reportes: [ReporteIndividualSchema]
},
{
  // Esto agrega automáticamente 'createdAt' y 'updatedAt'
  timestamps: true 
});

// Aseguramos que la combinación de departamento y clínica sea única
//BloqueSchema.index({ departamento: 1, clinica: 1 }, { /unique: true });
BloqueSchema.index({ "reportes.codigoEquipo": 1 }, { unique: true, sparse: true });
module.exports = mongoose.model('Bloque', BloqueSchema);