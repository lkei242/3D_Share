// src/screens/profile_screens/Informacion_de_la_cuenta/EditEmailScreen.js
import React, { useState, useRef } from 'react';
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
import { auth, db } from '../../config/firebase';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { verifyBeforeUpdateEmail } from 'firebase/auth';

export default function EditEmailScreen({ route, navigation }) {
  const { currentEmail } = route.params || {};
  const [email, setEmail] = useState(currentEmail || '');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

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

  const validateEmailOnBlur = () => {
    const v = email.trim();
    if (!v) return showToast('El correo es obligatorio.');
    if (v.length > 100) return showToast('Máximo 100 caracteres.');
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(v)) return showToast('Solamente correos @gmail.com.');
  };

  const handleSave = async () => {
    const v = email.trim();
    if (!v) return showToast('El correo no puede estar vacío.');
    if (v.length > 100) return showToast('Máximo 100 caracteres.');
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(v)) return showToast('Solamente correos @gmail.com.');

    if (v === currentEmail) return showToast('El correo es el mismo que el actual.');

    // Verificar que no esté en uso
    const q = query(
      collection(db, 'users'),
      where('email', '==', v)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return showToast('Este correo ya está en uso.');

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return showToast('No hay usuario autenticado.');

      // Enviar correo de verificación al nuevo email
      await verifyBeforeUpdateEmail(user, v);

      showToast('Te enviamos un correo a tu nueva dirección. Confirmalo para completar el cambio.', 'success');
      setTimeout(() => navigation.goBack(), 3000);
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        // Necesita re-autenticación → ir a pantalla extra
        navigation.navigate('ReauthenticateScreen', { newEmail: v });
      } else {
        showToast('Error al guardar: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: isDark ? '#222' : '#E5E5E5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
          <Ionicons name="arrow-back" size={25} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Cambiar correo electrónico</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>Correo</Text>
        <TextInput
          style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC', color: colors.text }]}
          value={email}
          onChangeText={setEmail}
          onBlur={validateEmailOnBlur}
          keyboardType="email-address"
          placeholder="correo@ejemplo.com"
          placeholderTextColor={isDark ? '#777' : '#999'}
          autoCapitalize="none"
          editable={!loading}
          maxLength={100}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: '#546F1C' }]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.saveText}>Guardar</Text>
        )}
      </TouchableOpacity>

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
  },
  headerTitle: {
    fontSize: 18,
    marginLeft: 15,
    fontFamily: 'Nunito-Bold',
  },
  content: {
    padding: 25,
  },
  label: {
    fontSize: 16,
    marginBottom: 20,
    fontFamily: 'Nunito-Light',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    fontFamily: 'Nunito-Light',
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
