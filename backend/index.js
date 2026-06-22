// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeApp, cert } = require('firebase-admin/app');

// 1. Inicializar Firebase Admin SDK
const serviceAccount = require('./firebase-service-account.json');
initializeApp({
  credential: cert(serviceAccount)
});

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// 2. Rutas (Carga de Media)
const mediaRoutes = require('./src/routes/media');
app.use('/api/media', mediaRoutes);

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend de carga multimedia corriendo en puerto ${PORT}`);
});