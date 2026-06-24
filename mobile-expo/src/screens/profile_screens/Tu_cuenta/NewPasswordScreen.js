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
import { updatePassword } from 'firebase/auth';

export default function NewPasswordScreen({ navigation }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const handleConfirm = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado.');
      return;
    }

    try {
      await updatePassword(user, password);
      Alert.alert('Éxito', 'Contraseña actualizada correctamente');
      navigation.goBack();
    } catch (error) {
      console.log('Error al actualizar contraseña:', error);
      Alert.alert('Error', 'No se pudo actualizar la contraseña. Intente nuevamente.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Campo nueva contraseña */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
              borderColor: isDark ? '#333' : '#DCDCDC',
            },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Ingrese una nueva contraseña"
            placeholderTextColor={isDark ? '#888' : '#999'}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Campo repetir contraseña */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
              borderColor: isDark ? '#333' : '#DCDCDC',
            },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Repita la contraseña"
            placeholderTextColor={isDark ? '#888' : '#999'}
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={22}
              color={colors.text}   // usa el color dinámico del tema
            />
          </TouchableOpacity>
        </View>


        <TouchableOpacity style={styles.button} onPress={handleConfirm}>
          <Text style={styles.buttonText}>Confirmar</Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text
            style={[
              styles.forgotText,
              { color: isDark ? '#AAA' : '#666' },
            ]}
          >
            ¿Olvidaste tu contraseña?
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  backButton: { marginTop: 55, marginLeft: 20 },
  content: { flex: 1, paddingHorizontal: 25, marginTop: 50 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 55,
    paddingHorizontal: 15,
  },
  eyeIcon: {
    paddingHorizontal: 12,
  },
  button: {
    backgroundColor: '#546F1C',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  forgotText: {
    textAlign: 'center',
    marginTop: 25,
    fontSize: 14,
  },
});
