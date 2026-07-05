// src/screens/profile_screens/Informacion_de_la_cuenta/EditPhoneScreen.js
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
import { auth, db } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function EditPhoneScreen({ route, navigation }) {
  const { currentPhone } = route.params || {};
  const [phone, setPhone] = useState(currentPhone || '');
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

  const validatePhoneOnBlur = () => {
    const v = phone.trim();
    if (!v) return showToast('El teléfono es obligatorio.');
    if (!/^[\d\s\-\+\(\)]{7,20}$/.test(v)) return showToast('Formato de teléfono no válido.');
  };

  const handleSave = async () => {
    const v = phone.trim();
    if (!v) return showToast('El teléfono es obligatorio.');
    if (!/^[\d\s\-\+\(\)]{7,20}$/.test(v)) return showToast('Formato de teléfono no válido.');

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          phone: v,
        });
        showToast('Teléfono actualizado con éxito.', 'success');
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (error) {
      showToast('Error al guardar: ' + error.message);
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Cambiar Número de Teléfono</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.countryText, { color: colors.text }]}>+54 Argentina</Text>
        <TextInput
          style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC', color: colors.text }]}
          value={phone}
          onChangeText={setPhone}
          onBlur={validatePhoneOnBlur}
          keyboardType="phone-pad"
          placeholder="Ingrese su número"
          placeholderTextColor={isDark ? '#666' : '#999'}
          editable={!loading}
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
    paddingTop: 55,
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
  countryText: {
    fontSize: 15,
    fontFamily: 'Nunito-Light',
    marginBottom: 20,
  },
  input: {
    height: 55,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 15,
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