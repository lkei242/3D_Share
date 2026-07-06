import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { auth } from '../../config/firebase';
import { deleteUser, reauthenticateWithCredential, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { deleteAllUserData } from '../../config/deleteAccountUtils';

export default function DeactivateAccountScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';
  const [isGoogleOnly, setIsGoogleOnly] = useState(false);
  const [loading, setLoading] = useState(false);

    useEffect(() => {
    const checkProviders = (user) => {
      if (user) {
        const providers = user.providerData.map((p) => p.providerId);
        // Si tiene Google, usamos la ruta de Google.
        // Quitamos la restricción de "!providers.includes('password')" 
        // porque a veces Firebase lo vincula internamente.
        setIsGoogleOnly(providers.includes('google.com'));
      }
    };

    // Verificación síncrona inicial para evitar que se muestre la opción de contraseña por error
    checkProviders(auth.currentUser);
    
    const unsubscribe = onAuthStateChanged(auth, checkProviders);
    return unsubscribe;
  }, []);

  const deleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      await deleteAllUserData(user.uid);
      await deleteUser(user);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Reautenticación necesaria', 'Por seguridad, iniciá sesión de nuevo para eliminar tu cuenta.');
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
        } catch (reauthError) {
          Alert.alert('Error', 'No se pudo reautenticar. Intentá de nuevo.');
        }
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = () => {
    if (isGoogleOnly) {
      Alert.alert(
        'Desactivar cuenta',
        '¿Estás seguro? Esta acción es permanente y perderás el acceso.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: deleteAccount },
        ]
      );
    } else {
      navigation.navigate('DeactivateAccountPasswordScreen');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? '#222' : '#E5E5E5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Desactiva tu cuenta</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.question, { color: colors.text }]}>¿Quieres desactivar tu cuenta?</Text>
        <Text style={[styles.description, { color: isDark ? '#AAA' : '#666' }]}>
          Esta acción es permanente y perderás el acceso a ella.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleDeactivate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Desactivar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    paddingBottom: 20,
  },
  title: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginLeft: 15 },
  content: { flex: 1, marginTop: 210, alignItems: 'center', paddingHorizontal: 30 },
  question: { color: '#FFF', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
  description: { color: '#AAA', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  button: {
    width: '80%',
    backgroundColor: '#fc3535',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});