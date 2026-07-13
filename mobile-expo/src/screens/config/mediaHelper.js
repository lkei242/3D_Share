import { API_URL } from './api';


export const deleteMediaFromCloudinary = async (mediaUrl) => {
  if (!mediaUrl) return null;

  try {
    
    const parts = mediaUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    let resourceType = 'image'; 
    if (uploadIndex > 0) {
      resourceType = parts[uploadIndex - 1]; 
    }

    
    const match = mediaUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (!match) return null;
    const publicId = match[1];

    
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