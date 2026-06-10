// src/screens/config/api.js
import Constants from 'expo-constants';

const getApiUrl = () => {
  // Expo Go en celular físico: hostUri tiene la IP de la PC
  const hostUri = Constants.expoConfig?.hostUri;
  
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  }

  // Emulador Android
  if (__DEV__) {
    return 'http://10.0.2.2:3000';
  }

  // Producción (cuando subas a la nube)
  return 'https://tu-backend.up.railway.app';
};

export const API_URL = getApiUrl();