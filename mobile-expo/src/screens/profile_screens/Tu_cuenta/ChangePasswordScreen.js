import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { auth } from '../../config/firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const handleNext = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado.');
      return;
    }

    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );

    try {
      await reauthenticateWithCredential(user, credential);
      console.log('Reautenticación exitosa');
      navigation.navigate('NewPasswordScreen');
    } catch (error) {
      console.log('Error reautenticando:', error);
      Alert.alert('Error', 'La contraseña actual es incorrecta.');
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background }
      ]}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons
          name="arrow-back"
          size={28}
          color={colors.text}
        />
      </TouchableOpacity>

      <View style={styles.content}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
              borderColor: isDark ? '#333' : '#DCDCDC',
              color: colors.text,
            },
          ]}
          placeholder="Ingrese su contraseña actual"
          placeholderTextColor={isDark ? '#5f5a5a' : '#090909'}
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>Siguiente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  backButton: { marginTop: 55, marginLeft: 20 },
  content: { flex: 1, paddingHorizontal: 25, marginTop: 50 },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 25,
  },
  button: {
    backgroundColor: '#546F1C',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
