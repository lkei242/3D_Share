import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation, route }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [behavior, setBehavior] = useState(undefined);
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

    // ✅ Navegar de inmediato, sin esperar nada más
    navigation.replace('MainTabs');

    // ✅ Guardar en AsyncStorage en segundo plano (sin await)
    saveAccountToStorage(user, password);

  } catch (error) {
    alert(error.message);
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
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, flex: 1 }]}
            placeholder="Contraseña"
            placeholderTextColor="#707070"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
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
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={[styles.forgotPassword, { color: colors.letraschicas }]}>
            ¿Olvidaste tu contraseña?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
        >
          <Text style={styles.buttonText}>
            Ingresar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Welcome')}>
          <Text style={[styles.link, { color: colors.text }]}>
            Volver
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    paddingTop:'168',
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

  link: {
    color: '#cacaca',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 25,
    textDecorationLine: 'underline',
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.4, // 👈 esto separa las letras
  },
  forgotPassword: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 15,
    fontFamily: 'Nunito-Bold',
    letterSpacing: 1,
    marginBottom: 12,
  },
});