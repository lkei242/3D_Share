// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { initializeApp, cert } = require('firebase-admin');

// 1. Inicializar Firebase Admin SDK
const serviceAccount = require('./firebase-service-account.json');
initializeApp({
  credential: cert(serviceAccount)
});

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// 2. Conectar a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('🍃 Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error al conectar MongoDB:', err));

// 3. Rutas
const postsRoutes = require('./src/routes/posts');
app.use('/api/posts', postsRoutes);

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en puerto ${PORT}`);
});