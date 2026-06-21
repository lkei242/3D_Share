// backend/src/routes/posts.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const checkAuth = require('../middleware/auth'); // Verifica el JWT de Firebase
const Post = require('../models/Post');         // Modelo de MongoDB

// 1. POST /api/posts - Crear un post y guardar en base de datos
// Requiere cabecera: Authorization: Bearer <token_jwt>
router.post('/', checkAuth, upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ninguna imagen' });
    }

    // A. Subir el buffer directo a Cloudinary v2
    const resultado = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: '3d_share/posts', transformation: [{ width: 800, quality: 'auto' }] },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    // B. Crear el documento en MongoDB
    const nuevoPost = new Post({
      titulo: req.body.titulo || 'Sin título',
      descripcion: req.body.descripcion || '',
      imagenes: [resultado.secure_url],
      precio: req.body.precio ? parseFloat(req.body.precio) : null,
      autor: req.user.uid, // UID de Firebase inyectado por el middleware checkAuth
      vistas: 0
    });

    await nuevoPost.save();

    res.status(201).json({ success: true, post: nuevoPost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/posts/feed - Obtener posts paginados y formateados para el frontend
router.get('/feed', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipIndex = (page - 1) * limit;

    // A. Consultar posts en la BD
    const postsDb = await Post.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skipIndex);

    const total = await Post.countDocuments();

    // B. Si está vacía la BD (primera carga), enviamos mocks temporales para ver el diseño
    if (postsDb.length === 0 && page === 1) {
      return res.json({
        posts: [
          { id: 'm1', title: 'Soporte auriculares (Mock)', image: 'https://picsum.photos/seed/a1/400/300', price: '5000$', views: '1.2k', totalImages: 1 },
          { id: 'm2', title: 'Figura de dragón (Mock)', image: 'https://picsum.photos/seed/a2/400/300', price: null, views: '890', totalImages: 3 },
          { id: 'm3', title: 'Cancha de Boca (Mock)', image: 'https://picsum.photos/seed/a3/400/300', price: null, views: '45k', totalImages: 1 },
        ],
        hasMore: false
      });
    }

    // C. Mapear los campos de MongoDB al formato de la app
    const postsFormateados = postsDb.map(post => ({
      id: post._id.toString(),
      title: post.titulo,
      image: post.imagenes && post.imagenes.length > 0 ? post.imagenes[0] : 'https://picsum.photos/seed/placeholder/400/300',
      price: post.precio ? `${post.precio}$` : null,
      views: post.vistas >= 1000 ? `${(post.vistas / 1000).toFixed(1)}k` : post.vistas.toString(),
      totalImages: post.imagenes ? post.imagenes.length : 1
    }));

    res.json({
      posts: postsFormateados,
      hasMore: (page * limit) < total
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 3. GET /api/posts/user/:uid - Obtener posts de un usuario específico
router.get('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const postsDb = await Post.find({ autor: uid }).sort({ createdAt: -1 });

    const postsFormateados = postsDb.map(post => ({
      id: post._id.toString(),
      title: post.titulo,
      image: post.imagenes && post.imagenes.length > 0 ? post.imagenes[0] : 'https://picsum.photos/seed/placeholder/400/300',
      price: post.precio ? `${post.precio}$` : null,
      views: post.vistas >= 1000 ? `${(post.vistas / 1000).toFixed(1)}k` : post.vistas.toString(),
      totalImages: post.imagenes ? post.imagenes.length : 1
    }));

    res.json({
      posts: postsFormateados
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;