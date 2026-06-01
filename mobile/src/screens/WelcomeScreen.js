import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';

export default function WelcomeScreen({ navigation }) {
  const [title, setTitle] = useState('Iniciar Sesión en 3D Share');
  const [about, setAbout] = useState('Acerca de nosotros');

  return (
    <View style={styles.container}>

      {/* LOGO + TITLE EDITABLE */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
        />
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.titleInput}
        />
      </View>

      {/* BOTONES */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginText}>Iniciar Sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerText}>Registrarse</Text>
        </TouchableOpacity>
      </View>

      {/* ABOUT EDITABLE */}
      <View style={styles.bottomContainer}>
        <TextInput
          value={about}
          onChangeText={setAbout}
          style={styles.aboutInput}
        />
      </View>

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    paddingTop: 120,        // ← menos espacio arriba (era 90)
    paddingBottom: 5,     // ← menos espacio abajo (era 90)
    justifyContent: 'space-between',  // ← distribuye logo / botones / about
  },

  logoContainer: {
    alignItems: 'center',
    marginTop: 20,         // ← baja un poco el logo desde el top
  },

  logo: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
    marginBottom: 20,
  },

  titleInput: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    textAlign: 'center',
    minWidth: 250,
  },

  buttonsContainer: {
    flexDirection: 'row',
    marginBottom: 220,       // sin margen extra; space-between lo ubica más arriba
    gap: 20,              // ← espacio entre los botones
  },

  loginButton: {
    backgroundColor: '#010101',
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderRadius: 20,
    marginRight: 20,
  },

  registerButton: {
    backgroundColor: '#546F1C',
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderRadius: 20,
    paddingBottom: 20, 
  },

  loginText: {
    color: 'white',
    fontSize: 22,
    fontFamily: 'Nunito-Light',
  },

  registerText: {
    color: 'white',
    fontSize: 22,
    fontFamily: 'Nunito-Light',
  },

  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,     // ← empuja el "Acerca de nosotros" más abajo
  },

  aboutInput: {
    color: '#bbb',
    fontSize: 17,
    fontFamily: 'Nunito-Light',
    textAlign: 'center',
  },

});