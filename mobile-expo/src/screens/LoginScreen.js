import React, { useState, useEffect } from 'react';
import { useTheme } from '@react-navigation/native';
import { auth } from './config/firebase';
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

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [behavior, setBehavior] = useState(undefined);

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
      // 1. Loguearse en Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // 2. Obtener el Token JWT generado por Firebase
      const token = await user.getIdToken();
      // 3. Guardar el token en almacenamiento local o enviarlo en headers
      console.log("Token JWT listo para enviar al backend:", token);
      
      // Redirigir a la app principal
      navigation.replace('MainTabs');
    } catch (error) {
      alert(error.message);
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

        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground }]}
          placeholder="Contraseña"
          placeholderTextColor="#707070"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

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

        <TouchableOpacity onPress={() => navigation.goBack()}>
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