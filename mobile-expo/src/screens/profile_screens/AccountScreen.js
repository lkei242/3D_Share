// src/screens/profile_screens/AccountScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function AccountScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Tu cuenta</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={[styles.option, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]} onPress={() =>navigation.navigate('EditProfileInfoScreen')}>
          <Text style={[styles.optionText, { color: colors.text }]}>Editar Tu Información</Text>
          <Ionicons name="chevron-forward-circle" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.option, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]} onPress={() =>navigation.navigate('ChangePasswordScreen')}>
          <Text style={[styles.optionText, { color: colors.text }]}>Cambiar contraseña</Text>
          <Ionicons name="chevron-forward-circle" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.option, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]} onPress={() =>navigation.navigate('DeactivateAccountScreen')}>
          <Text style={[styles.optionText, { color: colors.text }]}>Desactivar cuenta</Text>
          <Ionicons name="chevron-forward-circle" size={24} color={colors.text} />
        </TouchableOpacity>
      </ScrollView>
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
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  content: {
    paddingHorizontal: 20,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 22,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 18,
  },
});