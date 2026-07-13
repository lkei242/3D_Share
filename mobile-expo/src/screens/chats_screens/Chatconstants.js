import { Dimensions } from 'react-native';


export const GREEN_ACCENT = '#546F1C';
export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');


export const getMediaCategory = (mimeType) => {
  if (!mimeType) return 'file';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
};



export const getVideoThumbnail = (url) => url.replace(/\.\w+$/, '.jpg');


export const formatTime = (secs) => {
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const canEditMessage = (msg) => {
  if (!msg) return false;
  
  if (msg.type === 'location' || msg.type === 'file' || msg.type === 'audio') return false;
  
  if ((msg.type === 'image' || msg.type === 'video' || msg.type === 'media_group') && !msg.caption) return false;
  
  return true;
};