// src/routes/posts.js
const cloudinary = require('../config/cloudinary');

router.post('/', upload.single('imagen'), async (req, res) => {
  try {
    // Subir el buffer directo a Cloudinary v2
    const resultado = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: '3d_share/posts', transformation: [{ width: 800, quality: 'auto' }] },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer); // ← el archivo viene en memoria como buffer
    });

    res.json({ success: true, url: resultado.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});