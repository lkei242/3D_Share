// src/screens/profile_screens/Informacion_de_la_cuenta/ReauthenticateScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { auth } from '../../config/firebase';
import { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from 'firebase/auth';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

GoogleSignin.configure({
  webClientId: Constants.expoConfig?.extra?.googleClientId,
});

export default function ReauthenticateScreen({ route, navigation }) {
  const { newEmail } = route.params || {};
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const user = auth.currentUser;
  const isGoogleUser = user?.providerData?.some(p => p.providerId === 'google.com');

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

  const handleReauthenticate = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return showToast('No hay usuario autenticado.');

    setLoading(true);
    try {
      let credential;

      if (isGoogleUser) {
        const response = await GoogleSignin.signIn();
        if (!isSuccessResponse(response)) {
          setLoading(false);
          return;
        }
        const { idToken } = response.data;
        credential = GoogleAuthProvider.credential(idToken);
      } else {
        if (!password) {
          setLoading(false);
          return showToast('Ingresá tu contraseña.');
        }
        credential = EmailAuthProvider.credential(user.email, password);
      }

      await reauthenticateWithCredential(user, credential);
      await verifyBeforeUpdateEmail(user, newEmail);

      showToast('Te enviamos un correo a tu nueva dirección para confirmar el cambio.', 'success');
      setTimeout(() => navigation.reset({
        index: 0,
        routes: [{ name: 'EditProfileInfoScreen' }],
      }), 3000);
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        showToast('Contraseña incorrecta.');
      } else {
        showToast('Error: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? '#222' : '#E5E5E5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
          <Ionicons name="arrow-back" size={25} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Confirmar cambio</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.description, { color: colors.text }]}>
          Para cambiar tu correo a{'\n'}
          <Text style={styles.emailHighlight}>{newEmail}</Text>
          {'\n\n'}
          {isGoogleUser
            ? 'Re-autenticate con Google para confirmar.'
            : 'ingresá tu contraseña actual.'}
        </Text>

        {isGoogleUser ? (
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleReauthenticate}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={22} color="#FFF" />
            <Text style={styles.googleButtonText}>Iniciar sesión con Google</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC', color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Contraseña actual"
              placeholderTextColor={isDark ? '#777' : '#999'}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleReauthenticate}
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#546F1C' }]}
              onPress={handleReauthenticate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveText}>Confirmar</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {loading && (
          <ActivityIndicator size="large" color="#546F1C" style={{ marginTop: 30 }} />
        )}
      </View>

      {/* TOAST */}
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
                  outputRange: [-20, 0],
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    marginLeft: 15,
    fontFamily: 'Nunito-Bold',
  },
  content: {
    padding: 25,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Nunito-Light',
    marginBottom: 25,
    lineHeight: 22,
  },
  emailHighlight: {
    fontFamily: 'Nunito-Bold',
    color: '#9DBD3F',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    fontFamily: 'Nunito-Light',
    fontSize: 15,
  },
  saveButton: {
    position: 'absolute',
    bottom: 40,
    right: 25,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: '#FFF',
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
  },
  googleButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    flex: 1,
  },
});
