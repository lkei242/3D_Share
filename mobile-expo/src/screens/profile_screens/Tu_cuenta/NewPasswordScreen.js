import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

export default function NewPasswordScreen({ navigation }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';
  const handleConfirm = () => {
    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    alert('Contraseña actualizada correctamente');
    navigation.goBack();
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
              backgroundColor: colors.card,
              borderColor: isDark ? '#333' : '#DADADA',
              color: colors.text,
            },
          ]}
          placeholder="Ingrese una nueva contraseña"
          placeholderTextColor={isDark ? '#888' : '#999'}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? '#333' : '#DADADA',
              color: colors.text,
            },
          ]}
          placeholder="Repita la contraseña"
          placeholderTextColor={isDark ? '#888' : '#999'}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleConfirm}
        >
          <Text style={styles.buttonText}>
            Confirmar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text
            style={[
              styles.forgotText,
              {
                color: isDark ? '#AAA' : '#666',
              },
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
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },

  backButton: {
    marginTop: 55,
    marginLeft: 20,
  },

  content: {
    flex: 1,
    paddingHorizontal: 25,
    marginTop: 50,
  },

  input: {
    height: 55,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 15,
    color: '#FFF',
    marginBottom: 20,
  },

  button: {
    backgroundColor: '#546F1C',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  forgotText: {
    color: '#AAA',
    textAlign: 'center',
    marginTop: 25,
    fontSize: 14,
  },
});