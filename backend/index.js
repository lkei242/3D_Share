
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeApp, cert } = require('firebase-admin/app');


const serviceAccount = require('./firebase-service-account.json');
initializeApp({
  credential: cert(serviceAccount)
});

const app = express();


app.use(cors());
app.use(express.json());


const mediaRoutes = require('./src/routes/media');
app.use('/api/media', mediaRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend de carga multimedia corriendo en puerto ${PORT}`);
});