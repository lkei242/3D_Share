// src/screens/profile_screens/PreferencesScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function PreferencesScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [africanMode, setAfricanMode] = useState(false);
  const [videoPreview, setVideoPreview] = useState(true);
  const [highQualityImages, setHighQualityImages] = useState(true);
  const [highQualityVideos, setHighQualityVideos] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Preferencias</Text>
      </View>

      <View style={styles.content}>
        {/* Idioma */}
        <View style={[styles.languageRow, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Idioma</Text>
          <TouchableOpacity style={[
            styles.languageButton, 
            { 
              backgroundColor: colors.card,
              borderColor: isDark ? '#555' : '#CCC'
            }
          ]}>
            <Text style={[styles.languageText, { color: colors.text }]}>ESPAÑOL</Text>
          </TouchableOpacity>
        </View>

        {/* Modo Oscuro */}
        <View style={[styles.row, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Modo Oscuro</Text>
          <Switch value={africanMode} onValueChange={setAfricanMode} />
        </View>

        {/* Vista previa */}
        <View style={[styles.row, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Vista previa de videos</Text>
          <Switch value={videoPreview} onValueChange={setVideoPreview} />
        </View>

        {/* Imágenes HQ */}
        <View style={[styles.row, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Imágenes de Alta Calidad</Text>
          <Switch value={highQualityImages} onValueChange={setHighQualityImages} />
        </View>

        {/* Videos HQ */}
        <View style={[styles.row, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Videos de alta calidad</Text>
          <Switch value={highQualityVideos} onValueChange={setHighQualityVideos} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  content: {
    paddingHorizontal: 20,
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  languageButton: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  languageText: {
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 17,
    flex: 1,
    marginRight: 15,
  },
});