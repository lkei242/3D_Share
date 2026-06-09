// src/screens/SearchScreen.js
import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Búsqueda</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>Pantalla de Búsqueda (En desarrollo)</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0B0B0B',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#aaa',
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
  },
});