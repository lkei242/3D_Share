// src/screens/RegisterScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@react-navigation/native';
import { auth, db } from './config/firebase';
import { API_URL } from './config/api';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
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
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons, Feather, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  // Control de pasos del registro (0 = Selección, 1 = Datos Obligatorios, 2 = Datos Opcionales)
  const [step, setStep] = useState(0);

  // Paso 1: Campos obligatorios
  const [profileName, setProfileName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Paso 2: Campos opcionales y adicionales
  const [image, setImage] = useState(null);
  const [presentation, setPresentation] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Control de UI
  const [loading, setLoading] = useState(false);
  const [behavior, setBehavior] = useState(undefined);
  const [errors, setErrors] = useState({});
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const timeoutRef = useRef(null);

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef(null);

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

  const sanitizeInput = (text) => {
    return text
      .replace(/</g, '')
      .replace(/>/g, '')
      .replace(/&/g, '')
      .replace(/"/g, '')
      .replace(/'/g, '');
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

  // Seleccionar la foto de perfil usando el carrete del dispositivo
  const pickProfileImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Se requieren permisos de galería para seleccionar una imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1], // Foto de perfil cuadrada
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(asset.mimeType)) {
        showToast('Solo se permiten imágenes JPG, PNG o WebP.');
        return;
      }
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (fileInfo.exists && fileInfo.size > 10 * 1024 * 1024) {
        showToast('La imagen no puede superar los 10MB.');
        return;
      }
      setImage(asset.uri);
    }
  };

  // Validaciones y avance al Paso 2
  const handleContinue = () => {
    const newErrors = {};

    // ProfileName
    const cleanProfileName = profileName.trim();
    if (!cleanProfileName) {
      newErrors.profileName = 'El nombre de perfil es obligatorio.';
    } else if (cleanProfileName.length > 50) {
      newErrors.profileName = 'Máximo 50 caracteres.';
    } else if (/^[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(cleanProfileName)) {
      newErrors.profileName = 'No puede empezar con números o símbolos.';
    } else if (/[^\wáéíóúÁÉÍÓÚñÑ\s.-]/.test(cleanProfileName)) {
      newErrors.profileName = 'Caracteres no permitidos.';
    }

    // Username
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      newErrors.username = 'El nombre de usuario es obligatorio.';
    } else if (cleanUsername.length < 3) {
      newErrors.username = 'Mínimo 3 caracteres.';
    } else if (cleanUsername.length > 20) {
      newErrors.username = 'Máximo 20 caracteres.';
    } else if (!/^[a-zA-Z]/.test(cleanUsername)) {
      newErrors.username = 'Debe empezar con una letra.';
    } else if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      newErrors.username = 'Solo letras, números y guion bajo.';
    } else if (usernameAvailable === false) {
      newErrors.username = 'Este usuario ya está en uso.';
    }

    // Email
    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      newErrors.email = 'El correo es obligatorio.';
    } else if (cleanEmail.length > 100) {
      newErrors.email = 'Máximo 100 caracteres.';
    } else if (!emailRegex.test(cleanEmail)) {
      newErrors.email = 'Formato de correo no válido.';
    }

    // Password
    if (!password) {
      newErrors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres.';
    } else if (password.length > 64) {
      newErrors.password = 'Máximo 64 caracteres.';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Debe tener al menos una mayúscula.';
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'Debe tener al menos un número.';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      newErrors.password = 'Debe tener un carácter especial (!@#$...).';
    }

    // BirthDate
    const cleanBirthDate = birthDate.trim();
    if (!cleanBirthDate) {
      newErrors.birthDate = 'La fecha de nacimiento es obligatoria.';
    } else {
      const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
      if (!dateRegex.test(cleanBirthDate)) {
        newErrors.birthDate = 'Formato: DD/MM/AAAA.';
      } else {
        const [day, month, year] = cleanBirthDate.split('/').map(Number);
        const birth = new Date(year, month - 1, day);
        const today = new Date();
        if (birth.getDate() !== day || birth.getMonth() !== month - 1 || birth.getFullYear() !== year) {
          newErrors.birthDate = 'Fecha no válida.';
        } else if (birth > today) {
          newErrors.birthDate = 'La fecha no puede ser futura.';
        } else {
          let age = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          if (age < 18) {
            newErrors.birthDate = 'Debes tener al menos 18 años.';
          }
        }
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showToast(firstError);
    } else {
      setStep(2);
    }
  };

  // Crear la cuenta en Firebase y guardar detalles adicionales en Firestore
  const handleRegister = async () => {
    if (presentation.trim().length > 200) {
      showToast('La presentación no puede superar los 200 caracteres.');
      return;
    }
    setLoading(true);
    try {
      // 1. Crear usuario
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      const token = await user.getIdToken();

      let profilePictureUrl = null;

      // 2. Subir imagen (usuario aún logueado)
      if (image) {
        const formData = new FormData();
        const blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function () { resolve(xhr.response); };
          xhr.onerror = function (e) { reject(new TypeError('Error al leer el archivo.')); };
          xhr.responseType = 'blob';
          xhr.open('GET', image, true);
          xhr.send(null);
        });
        const filename = image.split('/').pop();
        formData.append('imagen', blob, filename);
        const res = await fetch(`${API_URL}/api/media/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await res.json();
        if (res.ok) profilePictureUrl = uploadData.url;
      }

      // 3. Guardar en Firestore (usuario aún logueado)
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        profileName: sanitizeInput(profileName.trim()),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        birthDate: birthDate.trim(),
        profilePicture: profilePictureUrl || 'https://res.cloudinary.com/dvrjrpotj/image/upload/v1782073947/3d_share/default_avatar.png',
        presentation: sanitizeInput(presentation.trim()) || null,
        createdAt: new Date(),
      });

      // 4. Cerrar sesión DESPUÉS de guardar todo
      await signOut(auth);

      showToast('¡Cuenta creada con éxito!', 'success');
      setTimeout(() => navigation.replace('Login'), 1500);

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        showToast('Este correo ya está registrado. Intenta con otro.');
      } else {
        showToast(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={behavior}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ================= PASO 0: SELECCIÓN DE MÉTODO ================= */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Registrarse</Text>
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/logo.png')} style={styles.logo} />
            </View>

            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: '#DB4437' }]}
              onPress={() => alert('El registro con Google estará disponible próximamente.')}
            >
              <FontAwesome name="google" size={20} color="white" />
              <Text style={styles.socialButtonText}>Registrarse con Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep(1)}
            >
              <Feather name="mail" size={20} color="white" />
              <Text style={styles.buttonText}>Registrarse manualmente</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.link, { color: colors.text }]}>Volver</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= PASO 1: REGISTRO MANUAL (Campos obligatorios) ================= */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Registro Manual</Text>
            <Text style={[styles.subtitle, { color: colors.text, opacity: 0.6 }]}>Paso 1 de 2: Datos obligatorios</Text>

            <TextInput
              style={[styles.input, errors.profileName && styles.inputError, { backgroundColor: colors.inputBackground }]}
              placeholder="Nombre de perfil (Ej: Juan Pérez)"
              placeholderTextColor="#707070"
              value={profileName}
              onChangeText={(text) => {
                setProfileName(sanitizeInput(text));
                if (errors.profileName) setErrors((prev) => ({ ...prev, profileName: null }));
              }}
              maxLength={50}
            />

            <TextInput
              style={[styles.input, errors.username && styles.inputError, { backgroundColor: colors.inputBackground }]}
              placeholder="Nombre de usuario (Ej: juan_perez)"
              placeholderTextColor="#707070"
              value={username}
              onChangeText={(text) => {
                const filtered = text.toLowerCase().replace(/[^a-z0-9_]/g, '');  // <-- ya no necesitás a-zA-Z porque convertís a lower antes
                if (filtered !== username) {  // solo actualizás si cambió algo relevante
                  setUsername(filtered);
                }
                if (errors.username) setErrors((prev) => ({ ...prev, username: null }));
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                  checkUsernameAvailability(filtered);
                }, 500);
              }}
              autoCapitalize="none"
              autoCorrect={false}        // <-- agregá esto
              spellCheck={false}         // <-- y esto
              maxLength={20}
            />

            <TextInput
              style={[styles.input, errors.email && styles.inputError, { backgroundColor: colors.inputBackground }]}
              placeholder="Email"
              placeholderTextColor="#707070"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
            />

            <TextInput
              style={[styles.input, errors.password && styles.inputError, { backgroundColor: colors.inputBackground }]}
              placeholder="Contraseña (mínimo 6 caracteres)"
              placeholderTextColor="#707070"
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
              }}
              maxLength={64}
            />
            <TextInput
              style={[styles.input, errors.birthDate && styles.inputError, { backgroundColor: colors.inputBackground }]}
              placeholder="Fecha de nacimiento (DD/MM/AAAA)"
              placeholderTextColor="#707070"
              value={birthDate}
              onChangeText={(text) => {
                const filtered = text.replace(/[^0-9/]/g, '');
                if (filtered !== birthDate) {
                  setBirthDate(filtered);
                }
                if (errors.birthDate) setErrors((prev) => ({ ...prev, birthDate: null }));
              }}
              maxLength={10}
            />
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep(0)}>
              <Text style={[styles.link, { color: colors.text }]}>Atrás</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= PASO 2: COMPLETAR PERFIL (Campos opcionales) ================= */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Completa tu Perfil</Text>
            <Text style={[styles.subtitle, { color: colors.text, opacity: 0.6 }]}>Paso 2 de 2: Datos opcionales</Text>

            {/* SELECCIONAR FOTO DE PERFIL */}
            <TouchableOpacity style={styles.avatarPickerContainer} onPress={pickProfileImage}>
              <View style={[styles.avatarFrame, { borderColor: colors.avatarborder }]}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera" size={32} color="#FFF" />
                    <Text style={styles.avatarPlaceholderText}>Foto de perfil</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* PRESENTACIÓN / BIO */}
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.inputBackground }]}
              placeholder="Presentación / Biografía - Opcional"
              placeholderTextColor="#707070"
              multiline
              numberOfLines={3}
              value={presentation}
              onChangeText={setPresentation}
              maxLength={200}
            />
            <Text style={[styles.charCount, { color: colors.text, opacity: 0.5 }]}>
              {presentation.length}/200
            </Text>

            {/* CHECKBOX: TÉRMINOS Y CONDICIONES */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <Feather
                name={termsAccepted ? "check-square" : "square"}
                size={22}
                color={termsAccepted ? '#9DBD3F' : colors.text}
              />
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                Acepto los términos y condiciones de uso
              </Text>
            </TouchableOpacity>

            {/* BOTÓN REGISTRAR / CARGANDO */}
            {loading ? (
              <ActivityIndicator size="large" color="#546F1C" style={{ marginVertical: 15 }} />
            ) : (
              <TouchableOpacity
                style={[styles.button, !termsAccepted && styles.disabledButton]}
                onPress={handleRegister}
                disabled={!termsAccepted}
              >
                <Text style={styles.buttonText}>Crear Cuenta</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setStep(1)} disabled={loading}>
              <Text style={[styles.link, { color: colors.text }]}>Atrás</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* TOAST / POP-UP */}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 40,
  },
  stepContainer: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Nunito-Bold',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'Nunito-Regular',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#000',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#546F1C',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  disabledButton: {
    backgroundColor: '#354812',
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  socialButton: {
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  socialButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  link: {
    textAlign: 'center',
    marginTop: 25,
    textDecorationLine: 'underline',
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.4,
    opacity: 0.8,
    fontSize: 14,
  },
  avatarPickerContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  avatarFrame: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: 'Nunito-Bold',
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  checkboxLabel: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    flex: 1,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#E74C3C',
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