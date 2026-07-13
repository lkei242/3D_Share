
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
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';

export default function EditNameScreen({ route, navigation }) {
  const { currentProfileName, currentUsername } = route.params || {};
  const [profileName, setProfileName] = useState(currentProfileName || '');
  const [username, setUsername] = useState(currentUsername || '');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef(null);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const timeoutRef = useRef(null);

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

  const checkUsernameAvailability = async (usernameValue) => {
    if (!usernameValue || usernameValue.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '==', usernameValue.toLowerCase().trim())
      );
      const snapshot = await getDocs(q);
      setUsernameAvailable(snapshot.empty);
    } catch (error) {
      console.log('Error verificando username:', error);
      setUsernameAvailable(null);
    }
  };

  const validateProfileNameOnBlur = () => {
    const v = profileName.trim();
    if (!v) return showToast('El nombre de perfil es obligatorio.');
    if (v.length > 50) return showToast('Máximo 50 caracteres.');
    if (/^[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(v)) return showToast('No puede empezar con números o símbolos.');
    if (/[^\wáéíóúÁÉÍÓÚñÑ\s.-]/.test(v)) return showToast('Caracteres no permitidos.');
  };

  const validateUsernameOnBlur = () => {
    const v = username.trim();
    if (!v) return showToast('El nombre de usuario es obligatorio.');
    if (v.length < 3) return showToast('Mínimo 3 caracteres.');
    if (v.length > 20) return showToast('Máximo 20 caracteres.');
    if (!/^[a-zA-Z]/.test(v)) return showToast('Debe empezar con una letra.');
    if (/[^a-z0-9_]/.test(v)) return showToast('Solo letras, números y guion bajo (_).');
    if (v !== currentUsername) checkUsernameAvailability(v);
  };

  const handleSave = async () => {
    if (!profileName.trim() || !username.trim()) {
      return showToast('Los campos no pueden estar vacíos.');
    }
    if (profileName.trim().length > 50) return showToast('El nombre de perfil no puede superar 50 caracteres.');
    if (!/^[a-zA-Z]/.test(username.trim())) return showToast('El usuario debe empezar con una letra.');
    if (/[^a-z0-9_]/.test(username.trim())) return showToast('Solo letras, números y guion bajo en el usuario.');

    if (username.trim() !== currentUsername) {
      const q = query(
        collection(db, 'users'),
        where('username', '==', username.trim().toLowerCase())
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return showToast('Este nombre de usuario ya está en uso.');
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          profileName: profileName.trim(),
          username: username.trim().toLowerCase().replace('@', ''),
        });
        showToast('Nombres actualizados con éxito.', 'success');
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
      <View style={[styles.header, { backgroundColor: isDark ? '#121212' : '#FFFFFF', borderBottomColor: isDark ? '#222' : '#E5E5E5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
          <Ionicons name="arrow-back" size={25} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Cambiar nombres</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>Nombre de Perfil</Text>
        <TextInput
          style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC', color: colors.text }]}
          value={profileName}
          onChangeText={setProfileName}
          onBlur={validateProfileNameOnBlur}
          placeholder="Nombre de perfil"
          placeholderTextColor={isDark ? '#777' : '#999'}
          editable={!loading}
          maxLength={50}
        />

        <Text style={[styles.label, { marginTop: 30, color: colors.text }]}>Nombre de Usuario</Text>
        <TextInput
          style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC', color: colors.text }]}
          value={username}
          onChangeText={(text) => {
            const lower = text.toLowerCase();
            setUsername(lower);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              if (lower !== currentUsername) checkUsernameAvailability(lower);
            }, 500);
          }}
          onBlur={validateUsernameOnBlur}
          placeholder="Nombre de usuario"
          placeholderTextColor={isDark ? '#777' : '#999'}
          autoCapitalize="none"
          editable={!loading}
          maxLength={20}
        />
        {usernameAvailable === false && (
          <Text style={styles.usernameTaken}>Este usuario ya está en uso</Text>
        )}
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

      {}
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
  label: {
    fontSize: 16,
    marginBottom: 10,
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
  usernameTaken: {
    color: '#E74C3C',
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
    marginTop: 5,
    marginBottom: 10,
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
