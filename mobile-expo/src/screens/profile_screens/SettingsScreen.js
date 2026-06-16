import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen({ navigation }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textnegrita }]}>Configuración</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          <Image
            source={require('../../../assets/profile_picture.jpg')}
            style={[styles.avatar, { borderColor: colors.avatarborder, backgroundColor: colors.card }]}
          />
          <Text style={[styles.username, { color: colors.textnegrita }]}>Nombre</Text>
        </View>

        {/* Las opciones ahora usan colors.border de React Navigation de manera limpia */}
        <TouchableOpacity 
          style={[styles.option, { borderBottomColor: colors.border }]} 
          onPress={() => navigation.navigate('Account')}
        >
          <Text style={[styles.optionText, { color: colors.text }]}>Cuenta</Text>
          <Ionicons name="chevron-forward-circle" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.option, { borderBottomColor: colors.border }]} 
          onPress={() => navigation.navigate('Security')}
        >
          <Text style={[styles.optionText, { color: colors.text }]}>Seguridad</Text>
          <Ionicons name="chevron-forward-circle" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.option, { borderBottomColor: colors.border }]} 
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={[styles.optionText, { color: colors.text }]}>Notificaciones</Text>
          <Ionicons name="chevron-forward-circle" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.option, { borderBottomColor: colors.border }]} 
          onPress={() => navigation.navigate('Preferences')}
        >
          <Text style={[styles.optionText, { color: colors.text }]}>Preferencias</Text>
          <Ionicons name="chevron-forward-circle" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.option, { borderBottomColor: colors.border }]} 
          onPress={() => navigation.navigate('Activity')}
        >
          <Text style={[styles.optionText, { color: colors.text }]}>Tu Actividad</Text>
          <Ionicons name="chevron-forward-circle" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutButton, {backgroundColor: colors.botonrojo}]}
          onPress={() => navigation.navigate('Welcome')}
        >
          <Text style={styles.logoutText}>Cerrar sesión</Text>
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
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2, // Añadido para que se note el avatarborder
    marginBottom: 10,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 18,
  },
  logoutButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 25,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});