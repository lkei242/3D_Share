import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import Constants from 'expo-constants';

// IMPORTANTE: este debe ser el "Web client (auto creado por Google Service)",
// el mismo que usa Firebase Auth, NO el "Web client 2".
const webClientId = Constants.expoConfig?.extra?.googleClientId;

GoogleSignin.configure({
  webClientId,
});

export async function signInWithGoogle(onSuccess, onError) {
  try {
    await GoogleSignin.hasPlayServices();
    // Cerrar sesión previa de Google para forzar el selector de cuentas
    await GoogleSignin.signOut();
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      // El usuario canceló el flujo, no es un error real
      return;
    }

    const { idToken } = response.data;
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    const userDoc = doc(db, 'users', user.uid);
    const snap = await getDoc(userDoc);
    if (!snap.exists()) {
      await setDoc(userDoc, {
        uid: user.uid,
        profileName: user.displayName || 'Usuario',
        username: (user.email || 'user').split('@')[0].toLowerCase(),
        email: user.email || '',
        profilePicture: user.photoURL || '',
        presentation: '',
        birthDate: '',
        createdAt: serverTimestamp(),
      });
    }

    onSuccess?.();
  } catch (error) {
    console.log('Error en Google Sign-In:', error);
    onError?.(error.message || 'Error al iniciar sesión con Google');
  }
}