import { initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeAuth,
  getReactNativePersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; 

const firebaseConfig = {
  apiKey: "AIzaSyDx0J4och1KNhJPgLzFj7HFjqaD56D5KNE",
  authDomain: "dshare-6b84f.firebaseapp.com",
  projectId: "dshare-6b84f",
  storageBucket: "dshare-6b84f.firebasestorage.app",
  messagingSenderId: "177855023674",
  appId: "1:177855023674:web:8e345be47607a689030303"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app, 'default');

export { auth, db };