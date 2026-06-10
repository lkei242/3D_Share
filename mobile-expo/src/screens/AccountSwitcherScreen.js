import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AccountSwitcherScreen({ navigation }) {
  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons
            name="settings-outline"
            size={28}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Perfil */}
      <View style={styles.profileSection}>
        <Image
          source={require('../../assets/profile_picture.jpg')}
          style={styles.avatar}
        />

        <View style={styles.stats}>
          <Text style={styles.stat}>58 amigos</Text>
          <Text style={styles.stat}>120 seguidores</Text>
          <Text style={styles.stat}>12 publicaciones</Text>
        </View>
      </View>

      <View style={styles.separator} />

      {/* Cuentas */}
      <View style={styles.accountsSection}>

        <TouchableOpacity style={styles.accountButton}>
          <Text style={styles.accountText}>
            Cuenta 1
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accountButton}>
          <Text style={styles.accountText}>
            Agregar cuenta
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accountButton}>
          <Text style={styles.accountText}>
            Ver todas las cuentas
          </Text>
        </TouchableOpacity>

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
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
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
    borderColor: '#546F1C',
  },

  stats: {
    marginLeft: 25,
  },

  stat: {
    color: 'white',
    fontSize: 18,
    marginBottom: 10,
  },

  separator: {
    height: 1,
    backgroundColor: '#333',
    marginTop: 40,
  },

  accountsSection: {
    padding: 25,
    gap: 15,
  },

  accountButton: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
  },

  accountText: {
    color: 'white',
    fontSize: 16,
  },
});