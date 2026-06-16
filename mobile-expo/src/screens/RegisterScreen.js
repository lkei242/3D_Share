import React, { useState, useEffect } from 'react';
import { auth } from './config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [behavior, setBehavior] = useState(undefined);
  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', () => {
      setBehavior(Platform.OS === 'ios' ? 'padding' : 'height');
    });
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setBehavior(undefined); // Al cerrarse, se reinicia el layout
    });
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const handleRegister = async () => {
    if (!email || !password) {
      alert("Por favor, completa todos los campos.");
      return;
    }
    try {
      // 1. Crear usuario en Firebase Auth
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Cuenta creada con éxito!");
      
      // 2. Redirigir a la app principal
      navigation.replace('MainTabs');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#121212' }}
      behavior={behavior}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          Registrarse
        </Text>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Usuario"
          placeholderTextColor="#707070"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#707070"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#707070"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>
            Crear Cuenta
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>
            Volver
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const GREEN = '#9DBD3F';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  title: {
    color: 'white',
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Nunito-Bold',
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  logo: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
  },

  input: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    fontFamily: 'Nunito-Bold', // opcional
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
    color: '#bbb',
    textAlign: 'center',
    marginTop: 25,
    textDecorationLine: 'underline',
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.4,
  },

});