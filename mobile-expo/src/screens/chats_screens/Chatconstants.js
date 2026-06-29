import { Dimensions } from 'react-native';

// --- Constantes globales del chat ---
export const GREEN_ACCENT = '#546F1C';
export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Clasifica el mimeType real en 'image' | 'video' | 'file'
export const getMediaCategory = (mimeType) => {
  if (!mimeType) return 'file';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
};

// Cloudinary genera automáticamente un frame del video como thumbnail
// si pedís la misma URL pero con extensión .jpg
export const getVideoThumbnail = (url) => url.replace(/\.\w+$/, '.jpg');

// Formatea segundos a "m:ss" (usado en grabación de audio)
export const formatTime = (secs) => {
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};