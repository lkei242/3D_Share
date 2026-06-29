import { API_URL } from './api';

/**
 * Borra cualquier archivo (imagen, video, audio o documento) de Cloudinary usando su URL completa.
 * @param {string} mediaUrl - URL completa de Cloudinary.
 * @returns {Promise<object>} - Respuesta del servidor.
 */
export const deleteMediaFromCloudinary = async (mediaUrl) => {
  if (!mediaUrl) return null;

  try {
    // 1. Extraer el resourceType (image, video, raw) de la URL
    const parts = mediaUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    let resourceType = 'image'; 
    if (uploadIndex > 0) {
      resourceType = parts[uploadIndex - 1]; // Obtiene el segmento anterior a 'upload'
    }

    // 2. Extraer el publicId de la URL (remueve la versión vXXXX/ y la extensión)
    const match = mediaUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (!match) return null;
    const publicId = match[1];

    // 3. Petición a la API del backend
    const response = await fetch(`${API_URL}/api/media/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId, resourceType }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleteMediaFromCloudinary:', error);
    throw error;
  }
};