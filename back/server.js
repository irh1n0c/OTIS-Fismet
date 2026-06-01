const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const connectDB = require('./config/db');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const reportesRoutes = require('./routes/api/reportes');
const { ensureAuth } = require('./middleware/auth');

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

const app = express();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_session_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions',
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName || profile.name?.givenName || 'Usuario Google';
        const avatar = profile.photos?.[0]?.value;

        if (!email) {
          return done(new Error('No se pudo obtener el correo de Google')); 
        }

        let user = await User.findOne({ googleId });
        if (!user) {
          user = await User.create({
            googleId,
            email,
            name,
            avatar,
          });
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

app.use('/api/auth', authRoutes);
app.use('/api/reportes', ensureAuth, reportesRoutes);

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
  res.send('API de Reportes FISMET funcionando...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
//hi