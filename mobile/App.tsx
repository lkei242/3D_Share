import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>

      <View style={styles.logoContainer}>
        <View style={styles.logoCircle} />
        <Text style={styles.title}>
          Iniciar Sesión en 3D Share
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginText}>
            Iniciar Sesión
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerText}>
            Registrarse
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity>
        <Text style={styles.aboutText}>
          Acerca de nosotros
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const GREEN = '#9DBD3F';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 40,
  },

  logoContainer: {
    alignItems: 'center',
  },

  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: GREEN,
    marginBottom: 30,
  },

  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: '300',
  },

  buttonsContainer: {
    flexDirection: 'row',
    gap: 15,
  },

  loginButton: {
    backgroundColor: '#111',
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 10,
  },

  registerButton: {
    backgroundColor: GREEN,
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 10,
  },

  loginText: {
    color: 'white',
    fontSize: 16,
  },

  registerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  aboutText: {
    color: '#bbb',
    textDecorationLine: 'underline',
  },
});