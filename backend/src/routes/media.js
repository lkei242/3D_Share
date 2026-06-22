// backend/src/routes/media.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const checkAuth = require('../middleware/auth'); // Middleware existente de Firebase Auth

// POST /api/media/upload - Sube una imagen a Cloudinary y retorna su URL segura
router.post('/upload', checkAuth, upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ninguna imagen' });
    }

    // Subir buffer de la imagen a Cloudinary
    const resultado = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: '3d_share/posts', transformation: [{ width: 800, quality: 'auto' }] },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    // Retornamos la URL segura
    res.status(200).json({ success: true, url: resultado.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;