// src/screens/RegisterScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@react-navigation/native';
import { auth, db } from './config/firebase';
import { signInWithGoogle } from './config/googleSignIn';
import { API_URL } from './config/api';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons, Feather, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import DateTimePicker from '@react-native-community/datetimepicker';



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
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [birthDate, setBirthDate] = useState('');

  // Paso 2: Campos opcionales y adicionales
  const [image, setImage] = useState(null);
  const [presentation, setPresentation] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [showOptions, setShowOptions] = useState(false);

  // Control de UI
  const [loading, setLoading] = useState(false);
  const [behavior, setBehavior] = useState(undefined);
  const [errors, setErrors] = useState({});
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const timeoutRef = useRef(null);
  const usernameRef = useRef(null);
  const profileNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // DatePicker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date(2000, 0, 1));
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
  // Validaciones en tiempo real al salir del campo (onBlur)
  const validateProfileNameOnBlur = () => {
    const v = profileName.trim();
    if (!v) return showToast('El nombre de perfil es obligatorio.');
    if (/^[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(v)) return showToast('El nombre no puede empezar con números o símbolos.');
    if (/[^\wáéíóúÁÉÍÓÚñÑ\s.-]/.test(v)) return showToast('El nombre contiene caracteres no permitidos.');
  };

  const validateUsernameOnBlur = () => {
    const v = username.trim();
    if (!v) return showToast('El nombre de usuario es obligatorio.');
    if (v.length < 3) return showToast('El usuario debe tener al menos 3 caracteres.');
    if (!/^[a-zA-Z]/.test(v)) return showToast('El usuario debe empezar con una letra.');
    if (/[^a-z0-9_]/.test(v)) return showToast('Solo se permiten letras, números y guion bajo (_).');
  };

  const validateEmailOnBlur = () => {
    const v = email.trim();
    if (!v) return showToast('El correo es obligatorio.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return showToast('El formato del correo no es válido. Solamente @gmail');
  };

  const validatePasswordOnBlur = () => {
    const v = password;
    if (!v) return showToast('La contraseña es obligatoria.');
    if (v.length < 6) return showToast('La contraseña debe tener al menos 6 caracteres.');
    if (!/[A-Z]/.test(v)) return showToast('La contraseña debe tener al menos una mayúscula.');
    if (!/[0-9]/.test(v)) return showToast('La contraseña debe tener al menos un número.');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(v)) return showToast('La contraseña debe tener un carácter especial (!@#\$...).');
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

  const removeProfilePicture = () => {
    setShowOptions(false);
    setImage(null);
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
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
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

    // Confirm Password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirmá tu contraseña.';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    // BirthDate - ya validada y formateada por el DateTimePicker
    if (!birthDate.trim()) {
      newErrors.birthDate = 'La fecha de nacimiento es obligatoria.';
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
        profilePicture: profilePictureUrl || '',
        presentation: sanitizeInput(presentation.trim()) || null,
        createdAt: new Date(),
      });

      // 4. Guardar cuenta en AsyncStorage y cerrar sesión
      try {
        const raw = await AsyncStorage.getItem('stored_accounts');
        let accounts = raw ? JSON.parse(raw) : [];
        if (!accounts.some((a) => a.uid === user.uid)) {
          accounts.push({
            uid: user.uid,
            profileName: sanitizeInput(profileName.trim()),
            username: username.trim().toLowerCase(),
            email: email.trim(),
            profilePicture: profilePictureUrl || null,
            password: password,
          });
          await AsyncStorage.setItem('stored_accounts', JSON.stringify(accounts));
        }
      } catch (e) {
        console.log('Error guardando cuenta:', e);
      }

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
              onPress={() =>
                signInWithGoogle(
                  () => navigation.replace('MainTabs'),
                  (msg) => showToast(msg)
                )
              }
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
              ref={profileNameRef}
              style={[styles.input, errors.profileName && styles.inputError, { backgroundColor: colors.inputBackground }]}
              placeholder="Nombre de perfil (Ej: Juan Pérez)"
              placeholderTextColor="#707070"
              value={profileName}
              onChangeText={(text) => {
                setProfileName(sanitizeInput(text));
                if (errors.profileName) setErrors((prev) => ({ ...prev, profileName: null }));
              }}
              onBlur={validateProfileNameOnBlur}
              maxLength={50}
              returnKeyType="next"
              onSubmitEditing={() => usernameRef.current?.focus()}
            />

            <TextInput
              ref={usernameRef}
              style={[styles.input, errors.username && styles.inputError, { backgroundColor: colors.inputBackground }]}
              placeholder="Nombre de usuario (Ej: juan_perez)"
              placeholderTextColor="#707070"
              value={username}
              onChangeText={(text) => {
                const lower = text.toLowerCase();
                if (/[^a-z0-9_]/.test(lower)) {
                  showToast('Solo se permiten letras, números y guion bajo (_).');
                }
                setUsername(lower);
                if (errors.username) setErrors((prev) => ({ ...prev, username: null }));
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                  checkUsernameAvailability(lower);
                }, 500);
              }}
              onBlur={validateUsernameOnBlur}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              maxLength={20}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <TextInput
              ref={emailRef}
              style={[styles.input, errors.email && styles.inputError, { backgroundColor: colors.inputBackground }]}
              placeholder="Email"
              placeholderTextColor="#707070"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
              }}
              onBlur={validateEmailOnBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, errors.password && styles.inputError, { backgroundColor: colors.inputBackground, flex: 1}]}
                placeholder="Contraseña (mínimo 6 caracteres)"
                placeholderTextColor="#707070"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                }}
                onBlur={validatePasswordOnBlur}
                maxLength={64}
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color="#707070"
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.passwordContainer, { marginBottom: 15 }]}>
              <TextInput
                ref={confirmPasswordRef}
                style={[styles.input, errors.confirmPassword && styles.inputError, { backgroundColor: colors.inputBackground, flex: 1 }]}
                placeholder="Repetí tu contraseña"
                placeholderTextColor="#707070"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
                }}
                maxLength={64}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color="#707070"
                />
              </TouchableOpacity>
            </View>

            {/* FECHA DE NACIMIENTO - botón que abre el picker nativo */}
            <TouchableOpacity
              style={[styles.input, errors.birthDate && styles.inputError, { backgroundColor: colors.inputBackground, justifyContent: 'center' }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: birthDate ? '#000' : '#707070', fontFamily: 'Nunito-Bold', fontSize: 14 }}>
                {birthDate || 'Fecha de nacimiento'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={datePickerDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (event.type === 'dismissed') return;
                  if (selectedDate) {
                    setDatePickerDate(selectedDate);
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const year = selectedDate.getFullYear();
                    const formatted = `${day}/${month}/${year}`;
                    // Validar edad mínima
                    const today = new Date();
                    let age = today.getFullYear() - selectedDate.getFullYear();
                    const monthDiff = today.getMonth() - selectedDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate())) age--;
                    if (age < 15) {
                      showToast('Debes tener al menos 15 años para registrarte.');
                      setBirthDate('');
                    } else {
                      setBirthDate(formatted);
                      if (errors.birthDate) setErrors((prev) => ({ ...prev, birthDate: null }));
                    }
                  }
                }}
              />
            )}
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
            <TouchableOpacity style={styles.avatarPickerContainer} onPress={() => setShowOptions(true)}>
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

            {/* MODAL DE OPCIONES DE FOTO */}
            <Modal visible={showOptions} transparent animationType="fade">
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowOptions(false)}
              >
                <View style={[styles.modalContent, { backgroundColor: isDark ? '#2A2A2A' : '#FFF' }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Foto de perfil</Text>
                  <View style={[styles.modalDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => { setShowOptions(false); pickProfileImage(); }}
                  >
                    <Ionicons name="camera" size={22} color="#546F1C" />
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>Cambiar foto</Text>
                  </TouchableOpacity>
                  <View style={[styles.modalDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                  <TouchableOpacity style={styles.modalOption} onPress={removeProfilePicture}>
                    <Ionicons name="trash" size={22} color="#E74C3C" />
                    <Text style={[styles.modalOptionText, { color: '#E74C3C' }]}>Eliminar foto</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>

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
    borderWidth: 3,
    borderColor: '#E74C3C',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    marginBottom: 14,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    textAlign: 'right',
    marginTop: -10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '75%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalDivider: {
    height: 1,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});