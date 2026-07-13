import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@react-navigation/native';
import { auth, db } from './config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithGoogle } from './config/googleSignIn';

const translateAuthError = (code) => {
  const map = {
    'auth/user-not-found': 'No existe una cuenta con este correo',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-credential': 'Correo o contraseña incorrectos',
    'auth/invalid-email': 'El formato del correo no es válido',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/too-many-requests': 'Demasiados intentos. Intentá de nuevo más tarde',
    'auth/network-request-failed': 'Error de conexión. Revisá tu internet',
    'auth/email-already-in-use': 'Este correo ya está registrado',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/requires-recent-login': 'Debes volver a iniciar sesión',
    'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este correo usando otro método de inicio de sesión',
    'auth/popup-closed-by-user': 'Inicio de sesión cancelado',
    'auth/cancelled-popup-request': 'Inicio de sesión cancelado',
  };
  return map[code] || code;
};

export default function LoginScreen({ navigation, route }) {
  const { colors, dark: isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [behavior, setBehavior] = useState(undefined);
  const passwordRef = useRef(null);

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    setToastType(type);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToastMessage(''));
    }, 3000);
  };

  const handleGoogleSignIn = () => {
    signInWithGoogle(
      () => navigation.replace('MainTabs'),
      (msg) => showToast(translateAuthError(msg))
    );
  };
  // Prellenar email si viene del AccountSwitcher
  useEffect(() => {
    if (route?.params?.email) {
      setEmail(route.params.email);
    }
  }, [route?.params?.email]);

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', () => {
      setBehavior(Platform.OS === 'ios' ? 'padding' : 'height');
    });
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setBehavior(undefined);
    });
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

const handleLogin = async () => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Imprimir token en consola para copiarlo en Postman/Thunder Client y probar el endpoint AUTENTICADO en .NET
    user.getIdToken().then(token => {
      console.log("\n🔑 [TEST AUTENTICADO] TOKEN DE FIREBASE PARA POSTMAN:");
      console.log(token);
      console.log("------------------------------------------------------------------\n");
    }).catch(() => {});

    // ✅ Navegar de inmediato, sin esperar nada más
    navigation.replace('MainTabs');

    // ✅ Guardar en AsyncStorage en segundo plano (sin await)
    saveAccountToStorage(user, password);

  } catch (error) {
    showToast(translateAuthError(error.code || error.message));
  }
};

// Función separada, se ejecuta después de navegar
const saveAccountToStorage = async (user, password) => {
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    const userData = snap.exists() ? snap.data() : null;
    const raw = await AsyncStorage.getItem('stored_accounts');
    let accounts = raw ? JSON.parse(raw) : [];
    const existingIndex = accounts.findIndex((a) => a.uid === user.uid);
    if (existingIndex === -1) {
      accounts.push({
        uid: user.uid,
        profileName: userData?.profileName || 'Usuario',
        username: userData?.username || 'usuario',
        email: user.email,
        profilePicture: userData?.profilePicture || null,
        password: password,
      });
    } else if (!accounts[existingIndex].password) {
      accounts[existingIndex].password = password;
    }
    await AsyncStorage.setItem('stored_accounts', JSON.stringify(accounts));
  } catch (e) {
    console.log('Error guardando cuenta:', e);
  }
};

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }} // <-- Fondo dinámico
      behavior={behavior}
    >
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} // <-- Fondo dinámico
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}> {/* <-- Texto dinámico */}
          Iniciar Sesión
        </Text>
        
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
          />
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground }]}
          placeholder="Email"
          placeholderTextColor="#707070"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            ref={passwordRef}
            style={[styles.input, { backgroundColor: colors.inputBackground, flex: 1 }]}
            placeholder="Contraseña"
            placeholderTextColor="#707070"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={22}
              color="#707070"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
        >
          <Text style={styles.buttonText}>
            Ingresar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={[styles.forgotPassword, { color: isDark ? '#94BA46' : '#546F1C' }]}>
            ¿Olvidaste tu contraseña?
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: isDark ? '#333' : '#D0D0D0' }]} />
          <Text style={[styles.dividerText, { color: isDark ? '#888' : '#999' }]}>o</Text>
          <View style={[styles.dividerLine, { backgroundColor: isDark ? '#333' : '#D0D0D0' }]} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
        >
          <Ionicons name="logo-google" size={22} color="#FFF" />
          <Text style={styles.googleButtonText}>Iniciar sesión con Google</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Welcome')}>
          <Text style={[styles.link, { color: colors.text }]}>
            Volver
          </Text>
        </TouchableOpacity>
      </ScrollView>
      {toastMessage !== '' && (
        <Animated.View style={[styles.toast, { backgroundColor: toastType === 'success' ? '#27AE60' : '#E74C3C', opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }] }]}>
          <Ionicons name={toastType === 'success' ? 'checkmark-circle' : 'alert-circle'} size={20} color="#FFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    paddingTop:'68',
    paddingHorizontal: 30,
  },

  title: {
    color: 'white',
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 30, // Margen normal hacia abajo
    fontFamily: 'Nunito-Bold',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20, // Margen normal hacia abajo
  },
  logo: {
    width: 220,
    height: 220,
    resizeMode: 'contain', // Se mantiene escalado de forma limpia
  },

  input: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 0,
    marginBottom: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    marginBottom: 14,
  },

  input2: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 2,
  },

  button: {
    backgroundColor: '#546F1C',
    borderRadius: 10,
    paddingVertical: 15,
    marginTop: 10,
  },

  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Nunito-Light',
  },

  forgotPassword: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 14,
    fontFamily: 'Nunito-Bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4285F4',
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 10,
  },
  googleButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  link: {
    color: '#cacaca',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 25,
    textDecorationLine: 'underline',
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.4,
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    flex: 1,
  },
});