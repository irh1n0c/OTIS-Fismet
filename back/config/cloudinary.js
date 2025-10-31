const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configurar el almacenamiento de Multer para Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'reportes-otis', // El nombre de la carpeta en Cloudinary
    format: async (req, file) => 'jpg', // Formato de la imagen
    public_id: (req, file) => file.originalname + '-' + Date.now(), // Nombre único
  },
});

// Crear el 'middleware' de carga de Multer
const upload = multer({ storage: storage });

module.exports = upload;