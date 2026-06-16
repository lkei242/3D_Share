// src/screens/SearchScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';

export default function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[
        styles.header, 
        { 
          backgroundColor: isDark ? '#0B0B0B' : '#F5F5F5', 
          paddingTop: insets.top + 8 
        }
      ]}>
        <Text style={[styles.title, { color: colors.text }]}>Búsqueda</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.text, { color: isDark ? '#aaa' : '#666' }]}>
          Pantalla de Búsqueda (En desarrollo)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
  },
});