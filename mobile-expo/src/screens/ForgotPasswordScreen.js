import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');

  const handleResetPassword = () => {
    // Aquí luego conectarás con tu backend/Firebase
    alert(`Se enviaron instrucciones a ${email}`);
  };

  return (
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
            Recuperar Contraseña
        </Text>
        <View style={styles.logoContainer}>
            <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            />
        </View>
      <Text style={styles.description}>
        Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#707070"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleResetPassword}
      >
        <Text style={styles.buttonText}>
          Enviar instrucciones
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backLink}>
          Volver al inicio de sesión
        </Text>
      </TouchableOpacity>

      </KeyboardAwareScrollView>
  );
}

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
    fontFamily: 'Nunito-Bold',
    marginBottom: 20,
    transform: [{ translateY: -85 }],
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 25,
    marginBottom: 140,
    marginTop: -150,
  },
  logo: {
    width: 220,
    height: 220,
    transform: [{ translateY: 55 }],
    resizeMode: 'contain',
  },

  description: {
    color: '#CACACA',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 50,
    fontFamily: 'Nunito-Light',
  },

  input: {
    backgroundColor: '#ffffff',
    color: 'black',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 20,
    marginBottom: 30,
  },

  button: {
    backgroundColor: '#546F1C',
    borderRadius: 10,
    paddingVertical: 15,
  },

  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Nunito-Light',
  },

  backLink: {
    color: '#CACACA',
    textAlign: 'center',
    marginTop: 25,
    marginBottom: 100,
    textDecorationLine: 'underline',
    letterSpacing: 1,
    fontFamily: 'Nunito-Bold',
  },
});