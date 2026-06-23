import React, { useState, useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, cancelAnimation, Easing, withSequence } from 'react-native-reanimated';
import { useTheme } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';


export default function WelcomeScreen({ navigation }) {
  const { colors } = useTheme();

  const rotationValue = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      rotationValue.value = withSequence(

        withTiming(1080, {
          duration: 2500,
        }),

        withTiming(0, {
          duration: 0,
        })
      );
    };

    const loop = () => {
      animate();
      setTimeout(loop, 9600);
    };

    loop();

    return () => {
      cancelAnimation(rotationValue);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationValue.value}deg` }],
  }));
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ... todo tu código JSX original ... */}
      <View style={styles.logoContainer}>
        <Animated.Image
          source={require('../../assets/logo.png')}
          style={[styles.logo, animatedStyle]}
        />
        <Text style={[styles.titleInput, { color: colors.text }]}>
          Iniciar Sesión en 3D Share
        </Text>
      </View>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginText}>Iniciar Sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerText}>Registrarse</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bottomContainer}>
        <Text style={[styles.aboutInput, { color: colors.text, opacity: 0.6 }]}>
          Acerca de nosotros
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 120,
    paddingBottom: 5,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logo: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  titleInput: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    textAlign: 'center',
    paddingBottom: 60,
    minWidth: 250,
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginBottom: 220,
    gap: 20,
  },
  loginButton: {
    backgroundColor: '#94BA46',
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderRadius: 20,
    marginRight: 20,
  },
  registerButton: {
    backgroundColor: '#546F1C',
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderRadius: 20,
  },
  loginText: {
    color: 'white',
    fontSize: 22,
    fontFamily: 'Nunito-Light',
  },
  registerText: {
    color: 'white',
    fontSize: 22,
    fontFamily: 'Nunito-Light',
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
  },
  aboutInput: {
    fontSize: 17,
    fontFamily: 'Nunito-Light',
    textAlign: 'center',
  },
});