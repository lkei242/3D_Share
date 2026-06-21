import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DeactivateAccountPasswordScreen({ navigation }) {
  const [password, setPassword] = useState('');

  const handleNext = () => {
    // Aquí validarás la contraseña más adelante
    console.log('Contraseña ingresada:', password);
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

        <Text style={styles.label}>
            Ingrese su contraseña actual
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ingrese su contraseña actual"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
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
        paddingHorizontal: 25,
        marginTop: 80,
    },

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

    button: {
        backgroundColor: '#fc3535',
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
    },

    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    label: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 50,
    },
});