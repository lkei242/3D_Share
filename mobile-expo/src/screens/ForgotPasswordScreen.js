import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState } from 'react';
import { useTheme } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');

  const handleResetPassword = () => {
    alert(`Se enviaron instrucciones a ${email}`);
  };

  return (
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>
            Recuperar Contraseña
        </Text>
        <View style={styles.logoContainer}>
            <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            />
        </View>
      <Text style={[styles.description, { color: colors.text, opacity: 0.8 }]}>
        Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
      </Text>

      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground }]}
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
        <Text style={[styles.backLink, { color: colors.text }]}>
          Volver al inicio de sesión
        </Text>
      </TouchableOpacity>

      </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 200,
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 30,
    textAlign: 'center',
    fontFamily: 'Nunito-Bold',
    marginBottom: 20,
    transform: [{ translateY: -85 }],
  },
  logoContainer: {
    alignItems: 'center',
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
    textAlign: 'center',
    marginTop: 25,
    marginBottom: 100,
    textDecorationLine: 'underline',
    letterSpacing: 1,
    fontFamily: 'Nunito-Bold',
    opacity: 0.8,
  },
});