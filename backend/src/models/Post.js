// backend/src/models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true,
  },
  descripcion: {
    type: String,
    default: '',
  },
  imagenes: {
    type: [String],  // Array de URLs de Cloudinary
    required: true,
  },
  precio: {
    type: Number,
    default: null,   // null = no está a la venta
  },
  autor: {
    type: String,    // UID de Firebase del usuario que publicó
    required: true,
  },
  vistas: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,  // Crea automáticamente createdAt y updatedAt
});

module.exports = mongoose.model('Post', postSchema);