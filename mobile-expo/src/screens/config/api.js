
import Constants from 'expo-constants';

const getApiUrl = () => {
  
  const hostUri = Constants.expoConfig?.hostUri;
  
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  }

  
  if (__DEV__) {
    return 'http://10.0.2.2:3000';
  }

  
  return 'https://tu-backend.up.railway.app';
};

export const API_URL = getApiUrl();