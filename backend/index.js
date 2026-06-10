// backend/index.js
require('dotenv').config();
const dns = require('dns');
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
if (process.env.MONGO_URI?.startsWith('mongodb+srv://')) {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000
})
  .then(() => console.log('🍃 Conectado a MongoDB Atlas'))
  .catch(err => {
    console.error('Error al conectar MongoDB:', err);
    console.error('Revisa estas causas posibles:');
    console.error('- El URI de MongoDB Atlas está correcto y usa el nombre de base de datos.');
    console.error('- Tu IP está permitida en la configuración de red de Atlas.');
    console.error('- Tu DNS puede estar bloqueando consultas SRV.');
  });

// 3. Rutas
const postsRoutes = require('./src/routes/posts');
app.use('/api/posts', postsRoutes);

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en puerto ${PORT}`);
});