// src/screens/profile_screens/PreferencesScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Modal } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../context/ThemeContext';

export default function PreferencesScreen({ navigation }) {
  const { colors } = useTheme();
  // isDark y setDarkMode vienen del ThemeContext: este switch ahora
  // cambia el tema real de toda la app (y se guarda).
  const { isDark, themeMode, setThemeMode } = useAppTheme();

  const [videoPreview, setVideoPreview] = useState(true);
  const [highQualityImages, setHighQualityImages] = useState(true);
  const [highQualityVideos, setHighQualityVideos] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);

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
          <TouchableOpacity
            style={[styles.themePicker, { backgroundColor: colors.card, borderColor: isDark ? '#555' : '#CCC' }]}
            onPress={() => setShowThemeModal(true)}
          >
            <Text style={[styles.themePickerText, { color: colors.text }]}>
              {themeMode === 'auto' ? 'Automático' : themeMode === 'dark' ? 'Oscuro' : 'Claro'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.text} />
          </TouchableOpacity>
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

      <Modal visible={showThemeModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowThemeModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Modo de pantalla</Text>
            {[
              { key: 'auto', label: 'Automático', icon: 'phone-portrait-outline' },
              { key: 'light', label: 'Claro', icon: 'sunny-outline' },
              { key: 'dark', label: 'Oscuro', icon: 'moon-outline' },
            ].map(({ key, label, icon }, index, arr) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.modalOption,
                  {
                    borderBottomColor: isDark ? '#333' : '#E0E0E0',
                    borderBottomWidth: index === arr.length - 1 ? 0 : 1,
                  },
                ]}
                onPress={() => {
                  setThemeMode(key);
                  setShowThemeModal(false);
                }}
              >
                <Ionicons name={icon} size={22} color={colors.text} />
                <Text style={[styles.modalOptionText, { color: colors.text }]}>
                  {label}
                </Text>
                {themeMode === key && (
                  <Ionicons name="checkmark" size={22} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  themePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  themePickerText: {
    fontWeight: '600',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalOptionText: {
    fontSize: 16,
    flex: 1,
  },
});