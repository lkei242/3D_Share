// src/screens/ProfileScreen.js

import React from 'react';
import {View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, Image} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Ionicons,
  Feather,
} from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 120,
        }}
      >
        {/* HEADER */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 8,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('AccountSwitcher')}
          >
            <Text style={styles.username}>
              NombreUsuario
            </Text>

            <Text style={styles.handle}>
              @usuario
            </Text>
          </TouchableOpacity>

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

        {/* PERFIL */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
           <Image
              source={require('../../assets/profile_picture.jpg')}
              style={styles.avatar}
            />
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => navigation.navigate('Contacts')}
              >
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Publicaciones</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stat}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => navigation.navigate('Contacts')}
              >
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Contactos</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stat}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => navigation.navigate('Contacts')}
              >
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Seguidores</Text>
              </TouchableOpacity>
              </View>
          </View>
        </View>

        {/* BOTONES */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>
              Editar perfil
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button}>
            <Feather
              name="share-2"
              size={18}
              color="#FFF"
            />

            <Text style={styles.buttonText}>
              Compartir
            </Text>
          </TouchableOpacity>
        </View>

        {/* REDES */}
        <View style={styles.socialSection}>
          <TouchableOpacity style={styles.socialItem}>
            <Feather
              name="message-circle"
              size={24}
              color="#25D366"
            />
            <Text style={styles.socialText}>
              WhatsApp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialItem}>
            <Feather
              name="twitter"
              size={24}
              color="#FFF"
            />
            <Text style={styles.socialText}>
              X
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialItem}>
            <Feather
              name="facebook"
              size={24}
              color="#1877F2"
            />
            <Text style={styles.socialText}>
              Facebook
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialItem}>
            <Feather
              name="instagram"
              size={24}
              color="#E1306C"
            />
            <Text style={styles.socialText}>
              Instagram
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialItem}>
            <Text style={styles.tiktok}>
              ♪
            </Text>

            <Text style={styles.socialText}>
              TikTok
            </Text>
          </TouchableOpacity>
        </View>

        
        <View style={styles.postsSection}>
          <Text style={styles.postsTitle}>
            Todavía no has publicado nada
          </Text>

        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },

  header: {
    backgroundColor: '#121212',
    paddingHorizontal: 20,
    paddingBottom: 15,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  username: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: 'Nunito-Bold',
  },

  handle: {
    color: '#999',
    fontSize: 14,
    marginTop: 2,
    fontFamily: 'Nunito-Regular',
  },

  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 25,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    transform: [{ translateY: -3 }, { translateX: -3 }],
    borderWidth: 3,
    borderColor: '#546F1C',
  },

  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 15,
  },

  stat: {
    alignItems: 'center',
  },

  statNumber: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: 'Nunito-Bold',
  },

  statLabel: {
    color: '#AAA',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    fontFamily: 'Nunito-Regular',
  },

  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 25,
    gap: 10,
  },

  button: {
    flex: 1,
    backgroundColor: '#546F1C',
    borderRadius: 12,
    paddingVertical: 12,

    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    gap: 8,
  },

  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
  },

  socialSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',

    marginTop: 30,
    marginHorizontal: 10,
    paddingVertical: 15,

    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#222',
  },

  socialItem: {
    alignItems: 'center',
  },

  socialText: {
    color: '#AAA',
    fontSize: 10,
    marginTop: 6,
  },

  tiktok: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },

  postsSection: {
    marginTop: 25,
    paddingHorizontal: 20,
  },

  postsTitle: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 18,
    marginBottom: 20,
    letterSpacing: 1,
    transform: [{ translateY: 120 }],
    fontFamily: 'Nunito-Bold',
  },

  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  postCard: {
    width: '31%',
    aspectRatio: 1,

    backgroundColor: '#1E1E1E',

    borderRadius: 10,
    marginBottom: 12,

    borderWidth: 1,
    borderColor: '#2B2B2B',
  },
});