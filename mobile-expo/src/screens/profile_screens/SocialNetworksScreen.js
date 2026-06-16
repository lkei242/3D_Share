// src/screens/profile_screens/SocialNetworksScreen.js
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';

const socialApps = [
  { id: '1', name: 'WhatsApp', icon: 'whatsapp', color: '#25D366' },
  { id: '2', name: 'X', icon: 'twitter', color: 'DYNAMIC' }, // Se ajustará dinámicamente según el tema
  { id: '3', name: 'Facebook', icon: 'facebook', color: '#1877F2' },
  { id: '4', name: 'Instagram', icon: 'instagram', color: '#E1306C' },
  { id: '5', name: 'TikTok', icon: 'music', color: 'DYNAMIC' }, // Se ajustará dinámicamente según el tema
];

export default function SocialNetworksScreen() {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.ScrollContainer}
      style={{ backgroundColor: colors.background }}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Redes Sociales</Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TextInput
            placeholder="Buscar"
            placeholderTextColor="#888"
            style={[
              styles.search, 
              { 
                backgroundColor: isDark ? '#2A2A2A' : '#EAEAEA',
                color: colors.text 
              }
            ]}
          />

          <Text style={[styles.subtitle, { color: isDark ? '#AAA' : '#666' }]}>
            Tus Formas de Contacto
          </Text>

          {socialApps.map((item) => {
            // Ajustar el color de X y TikTok en base al modo actual
            let appIconColor = item.color;
            if (item.color === 'DYNAMIC') {
              appIconColor = colors.text;
            }

            return (
              <TouchableOpacity key={item.id} style={styles.item}>
                <View style={styles.iconContainer}>
                  <FontAwesome name={item.icon} size={32} color={appIconColor} />
                </View>
                <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    borderRadius: 15,
    padding: 20,
  },
  search: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  subtitle: {
    marginBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemText: {
    marginLeft: 15,
    fontSize: 16,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  ScrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});