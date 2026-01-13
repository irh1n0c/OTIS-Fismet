const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

const app = express();

// Middlewares
app.use(cors()); // Permite peticiones desde tu frontend
app.use(express.json()); // Permite leer JSON del body
app.use(express.urlencoded({ extended: true })); // Permite leer datos de formularios

// Definir la ruta principal
app.use('/api/reportes', require('./routes/api/reportes'));

// Proxy público para imágenes (añade encabezados CORS)
app.get('/images/proxy', (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(400).send('Missing key parameter');

  // Evitar proxy abierto: no permitir URLs completas
  if (typeof key !== 'string' || /:\/\//.test(key)) return res.status(400).send('Invalid key');

  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  if (!base) return res.status(500).send('R2_PUBLIC_URL not configured');

  const imageUrl = `${base}/${key}`;
  const lib = imageUrl.startsWith('https') ? require('https') : require('http');

  lib.get(imageUrl, (imageRes) => {
    // Añadimos encabezados CORS para permitir descargas desde el frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    //Forward status and content-type
    res.statusCode = imageRes.statusCode || 200;
    if (imageRes.headers['content-type']) res.setHeader('Content-Type', imageRes.headers['content-type']);
    imageRes.pipe(res);
  }).on('error', (err) => {
    console.error('Error proxying image:', err);
    res.status(502).send('Error fetching image');
  });
});

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.send('API de Reportes FISMET funcionando... 🤖');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
//hi