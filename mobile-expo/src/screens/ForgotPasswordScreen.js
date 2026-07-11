import React, { useState, useRef } from 'react';
import { useTheme } from '@react-navigation/native';
import { auth, db } from './config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const translateAuthError = (code) => {
  const map = {
    'auth/user-not-found': 'No existe una cuenta con este correo',
    'auth/invalid-email': 'El formato del correo no es válido',
    'auth/too-many-requests': 'Demasiados intentos. Intentá de nuevo más tarde',
    'auth/network-request-failed': 'Error de conexión. Revisá tu internet',
  };
  return map[code] || code;
};

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, dark: isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);

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

  const handleReset = async () => {
    const v = email.trim();
    if (!v) {
      setEmailError(true);
      return showToast('Ingresá tu correo electrónico.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setEmailError(true);
      return showToast('Formato de correo no válido.');
    }
    if (!v.endsWith('@gmail.com')) {
      setEmailError(true);
      return showToast('Solo se permiten correos @gmail.com');
    }
    setEmailError(false);

    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', v));
      const snap = await getDocs(q);
      if (snap.empty) {
        showToast('No existe una cuenta con este correo electrónico.');
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, v);
      showToast('Te enviamos un correo para restablecer tu contraseña.', 'success');
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error) {
      showToast(translateAuthError(error.code || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={25} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>
          Recuperar cuenta
        </Text>

        <Text style={[styles.subtitle, { color: isDark ? '#AAAAAA' : '#555555' }]}>
          Ingresá el correo electrónico asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
        </Text>

        <TextInput
          style={[styles.input, emailError && styles.inputError, { backgroundColor: colors.inputBackground }]}
          placeholder="Email"
          placeholderTextColor="#707070"
          value={email}
          onChangeText={(text) => { setEmail(text); setEmailError(false); }}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleReset}
          editable={!loading}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Enviar enlace</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={[styles.link, { color: colors.text }]}>
            Volver al inicio de sesión
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {toastMessage !== '' && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: toastType === 'success' ? '#27AE60' : '#E74C3C',
              opacity: toastAnim,
              transform: [{
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                }),
              }],
            },
          ]}
        >
          <Ionicons
            name={toastType === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color="#FFF"
          />
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
    paddingTop: 68,
    paddingHorizontal: 30,
  },
  backButton: {
    marginBottom: 25,
  },
  title: {
    fontSize: 26,
    marginBottom: 12,
    fontFamily: 'Nunito-Bold',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 25,
    fontFamily: 'Nunito-Light',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#546F1C',
    borderRadius: 10,
    paddingVertical: 15,
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
  inputError: {
    borderWidth: 3,
    borderColor: '#E74C3C',
  },
});