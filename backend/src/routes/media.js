// backend/src/routes/media.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const checkAuth = require('../middleware/auth');

router.post('/upload', checkAuth, upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    // Detectar si el archivo es un audio por su mimetype o extensión
    const isAudio = req.file.mimetype.startsWith('audio/') || 
                    req.file.originalname.endsWith('.m4a') || 
                    req.file.originalname.endsWith('.caf') || 
                    req.file.originalname.endsWith('.3gp') || 
                    req.file.originalname.endsWith('.mp3');

    // Configuración para Cloudinary
    const options = {
      folder: isAudio ? '3d_share/audios' : '3d_share/posts',
      resource_type: 'auto', // 👈 Cloudinary detecta automáticamente el tipo (imagen, audio, etc.)
    };

    // Solo aplicar transformaciones de redimensionamiento si es una imagen
    if (!isAudio) {
      options.transformation = [{ width: 800, quality: 'auto' }];
    }

    const resultado = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }).end(req.file.buffer);
    });

    res.status(200).json({ success: true, url: resultado.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/delete', async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) return res.status(400).json({ error: 'publicId required' });
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;