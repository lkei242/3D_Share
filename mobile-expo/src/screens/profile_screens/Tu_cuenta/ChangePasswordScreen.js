import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');

    const handleNext = () => {
        console.log('Navegando a NewPasswordScreen');
        navigation.navigate('NewPasswordScreen');
    };

  return (
    <View style={styles.container}>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons
          name="arrow-back"
          size={28}
          color="#FFF"
        />
      </TouchableOpacity>

      <View style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="Ingrese su contraseña actual"
          placeholderTextColor="#888"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            >
            <Text style={styles.buttonText}>
                Siguiente
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
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 15,
    color: '#FFF',
    backgroundColor: '#1E1E1E',
    marginBottom: 25,
  },

  button: {
    backgroundColor: '#546F1C',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});