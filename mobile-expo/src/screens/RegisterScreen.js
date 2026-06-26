// src/screens/RegisterScreen.js
import React, { useState, useEffect } from 'react';
import { useTheme } from '@react-navigation/native';
import { auth, db } from './config/firebase';
import { API_URL } from './config/api';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
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
} from 'react-native';
import { Ionicons, Feather, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

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
      setImage(result.assets[0].uri);
    }
  };

  // Validaciones y avance al Paso 2
  const handleContinue = () => {
    if (!profileName.trim() || !username.trim() || !email.trim() || !password.trim() || !birthDate.trim()) {
      alert('Por favor, completa todos los campos obligatorios.');
      return;
    }
    if (password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setStep(2);
  };

  // Crear la cuenta en Firebase y guardar detalles adicionales en Firestore
  const handleRegister = async () => {
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
        profileName: profileName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        birthDate: birthDate.trim(),
        profilePicture: profilePictureUrl || 'https://res.cloudinary.com/dvrjrpotj/image/upload/v1782073947/3d_share/default_avatar.png',
        presentation: presentation.trim() || null,
        createdAt: new Date(),
      });

      // 4. Cerrar sesión DESPUÉS de guardar todo
      await signOut(auth);

      alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
      navigation.replace('Login');

    } catch (error) {
      alert(error.message);
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
              style={[styles.input, { backgroundColor: colors.inputBackground }]}
              placeholder="Nombre de perfil (Ej: Juan Pérez)"
              placeholderTextColor="#707070"
              value={profileName}
              onChangeText={setProfileName}
            />

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground }]}
              placeholder="Nombre de usuario (Ej: juan_perez)"
              placeholderTextColor="#707070"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground }]}
              placeholder="Email"
              placeholderTextColor="#707070"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground }]}
              placeholder="Contraseña (mínimo 6 caracteres)"
              placeholderTextColor="#707070"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground }]}
              placeholder="Fecha de nacimiento (DD/MM/AAAA)"
              placeholderTextColor="#707070"
              value={birthDate}
              onChangeText={setBirthDate}
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
            />

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
});