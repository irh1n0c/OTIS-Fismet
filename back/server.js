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

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.send('API de Reportes FISMET funcionando... 🤖');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});