import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DeactivateAccountScreen({ navigation }) {
    const handleDeactivate = () => {
        navigation.navigate('DeactivateAccountPasswordScreen');
    };

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color="#FFF"
          />
        </TouchableOpacity>

        <Text style={styles.title}>
          Desactiva tu cuenta
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.question}>
          ¿Quieres desactivar tu cuenta?
        </Text>

        <Text style={styles.description}>
          Esta acción es permanente y perderás el acceso a ella.
        </Text>

        <TouchableOpacity
            style={styles.button}
            onPress={handleDeactivate}
            >
            <Text style={styles.buttonText}>
                Desactivar
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingHorizontal: 20,
  },

  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 15,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  question: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 25,
  },

  description: {
    color: '#AAA',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },

  button: {
    width: '80%',
    backgroundColor: '#fc3535',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});