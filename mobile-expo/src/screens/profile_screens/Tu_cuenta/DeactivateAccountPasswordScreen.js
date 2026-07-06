import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { auth } from '../../config/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { deleteAllUserData } from '../../config/deleteAccountUtils';

export default function DeactivateAccountPasswordScreen({ navigation }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGoogleOnly, setIsGoogleOnly] = useState(false);
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

    useEffect(() => {
    const checkProviders = (user) => {
      if (user) {
        const providers = user.providerData.map((p) => p.providerId);
        // Misma lógica: si tiene Google, mostramos el botón de Google
        setIsGoogleOnly(providers.includes('google.com'));
      }
    };

    // Verificación síncrona inicial
    checkProviders(auth.currentUser);
    
    const unsubscribe = onAuthStateChanged(auth, checkProviders);
    return unsubscribe;
  }, []);

  const handleDeleteWithPassword = async () => {
    if (!password) {
      Alert.alert('Error', 'Ingresá tu contraseña.');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await deleteAllUserData(user.uid);
      await deleteUser(user);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Contraseña incorrecta.');
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWithGoogle = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        setLoading(false);
        return;
      }
      const { idToken } = response.data;
      const credential = GoogleAuthProvider.credential(idToken);
      await reauthenticateWithCredential(user, credential);
      await deleteAllUserData(user.uid);
      await deleteUser(user);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      Alert.alert('Error', 'No se pudo reautenticar. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {isGoogleOnly ? (
          <>
            <Text style={[styles.label, { color: colors.text }]}>
              Iniciá sesión con Google para confirmar
            </Text>
            <Text style={[styles.description, { color: isDark ? '#AAA' : '#666' }]}>
              Por seguridad, necesitamos que verifiques tu identidad antes de eliminar la cuenta.
            </Text>
            <TouchableOpacity style={styles.googleButton} onPress={handleDeleteWithGoogle} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.googleButtonText}>Iniciar sesión con Google</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Ingrese su contraseña actual</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC', color: colors.text }]}
              placeholder="Ingrese su contraseña actual"
              placeholderTextColor={isDark ? '#888' : '#999'}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteWithPassword} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Eliminar cuenta</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  backButton: { marginTop: 55, marginLeft: 20 },
  content: { paddingHorizontal: 25, marginTop: 80 },
  label: { color: '#FFF', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  description: { color: '#AAA', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 40 },
  input: {
    height: 55,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 15,
    color: '#FFF',
    marginBottom: 25,
  },
  deleteButton: {
    backgroundColor: '#fc3535',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: { color: '#000', fontSize: 16, fontWeight: '600' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});