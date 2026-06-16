// src/screens/profile_screens/AccountSwitcherScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function AccountSwitcherScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Cambiar cuenta</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Perfil */}
      <View style={styles.profileSection}>
        <Image
          source={require('../../../assets/profile_picture.jpg')}
          style={[styles.avatar, {borderColor:colors.avatarborder}]}
        />
        <View style={styles.stats}>
          <Text style={[styles.stat, { color: colors.text }]}>58 amigos</Text>
          <Text style={[styles.stat, { color: colors.text }]}>120 seguidores</Text>
          <Text style={[styles.stat, { color: colors.text }]}>12 publicaciones</Text>
        </View>
      </View>

      <View style={[styles.separator, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />

      {/* Cuentas */}
      <View style={styles.accountsSection}>
        <TouchableOpacity style={[styles.accountButton, { backgroundColor: colors.card }]}>
          <Text style={[styles.accountText, { color: colors.text }]}>Cuenta 1</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.accountButton, { backgroundColor: colors.card }]}>
          <Text style={[styles.accountText, { color: colors.text }]}>Agregar cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.accountButton, { backgroundColor: colors.card }]}>
          <Text style={[styles.accountText, { color: colors.text }]}>Ver todas las cuentas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 30,
    marginTop: -20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginTop: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  stats: {
    marginLeft: 25,
  },
  stat: {
    fontSize: 18,
    marginBottom: 10,
  },
  separator: {
    height: 1,
    marginTop: 40,
  },
  accountsSection: {
    padding: 25,
    gap: 15,
  },
  accountButton: {
    padding: 16,
    borderRadius: 12,
  },
  accountText: {
    fontSize: 16,
  },
});