// backend/src/routes/posts.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
// const Post = require('../models/Post'); // Descomentar cuando crees el modelo Post
// const User = require('../models/User'); // Descomentar cuando crees el modelo User

// 1. POST /api/posts - Crear un post y subir imagen a Cloudinary
router.post('/', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ninguna imagen' });
    }
    // Subir el buffer directo a Cloudinary v2
    const resultado = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: '3d_share/posts', transformation: [{ width: 800, quality: 'auto' }] },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });
    res.json({ success: true, url: resultado.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;

// 2. GET /api/posts/feed - Obtener posts paginados de usuarios seguidos
router.get('/feed', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipIndex = (page - 1) * limit;

    /* 
      TODO: Cuando implementes JWT y Base de Datos, el flujo será:
      1. Obtener el usuario autenticado: const userLogueado = await User.findById(req.user.id);
      2. Filtrar posts de usuarios seguidos: 
         const posts = await Post.find({ author: { $in: userLogueado.following } })
      
      POR AHORA, para probar el scroll infinito, podés devolver todos los posts de la BD:
    */
    
    // const posts = await Post.find()
    //   .sort({ createdAt: -1 })
    //   .limit(limit)
    //   .skip(skipIndex);
    //
    // const total = await Post.countDocuments();
    //
    // res.json({
    //   posts,
    //   hasMore: (page * limit) < total
    // });

    // Mock temporal para que no falle antes de tener base de datos
      res.json({
    posts: [
      { id: '1', title: 'Soporte auriculares', image: 'https://picsum.photos/seed/a1/400/300', price: '5000$', views: '1.2k', totalImages: 1 },
      { id: '2', title: 'Figura de dragón', image: 'https://picsum.photos/seed/a2/400/300', price: null, views: '890', totalImages: 3 },
      { id: '3', title: 'Cancha de Boca', image: 'https://picsum.photos/seed/a3/400/300', price: null, views: '45k', totalImages: 1 },
      { id: '4', title: 'Engranaje industrial', image: 'https://picsum.photos/seed/a4/400/300', price: '12000$', views: '200', totalImages: 2 },
      { id: '5', title: 'Maceta minimalista', image: 'https://picsum.photos/seed/a5/400/300', price: '3500$', views: '5k', totalImages: 1 },
      { id: '6', title: 'Robot articulado', image: 'https://picsum.photos/seed/a6/400/300', price: null, views: '18k', totalImages: 4 },
    ],
    hasMore: false
  });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;