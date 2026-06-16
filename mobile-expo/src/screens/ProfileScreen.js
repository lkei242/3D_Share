// src/screens/ProfileScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.navigate('AccountSwitcher')}>
            <Text style={[styles.username, { color: colors.text }]}>
              NombreUsuario
            </Text>
            <Text style={[styles.handle, { color: isDark ? '#999' : '#666' }]}>
              @usuario
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Ionicons
              name="settings-outline"
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* PERFIL */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, {borderColor:colors.avatarborder}]}>
           <Image
              source={require('../../assets/profile_picture.jpg')}
              style={styles.avatarImage}
            />
          </View>

          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Contacts')}>
              <Text style={[styles.statNumber, { color: colors.text }]}>0</Text>
              <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#555' }]}>Publicaciones</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Contacts')}>
              <Text style={[styles.statNumber, { color: colors.text }]}>0</Text>
              <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#555' }]}>Seguidores</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Contacts')}>
              <Text style={[styles.statNumber, { color: colors.text }]}>0</Text>
              <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#555' }]}>Seguidos</Text>
            </TouchableOpacity>
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
            <Feather name="share-2" size={18} color="#FFF" />
            <Text style={styles.buttonText}>
              Compartir
            </Text>
          </TouchableOpacity>
        </View>

        {/* REDES */}
        <View style={[styles.socialSection, { borderColor: isDark ? '#222' : '#E0E0E0' }]}>
          <TouchableOpacity style={styles.socialItem} onPress={() => navigation.navigate('SocialNetworks')}>
            <Feather name="message-circle" size={24} color="#25D366" />
            <Text style={[styles.socialText, { color: isDark ? '#AAA' : '#555' }]}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialItem} onPress={() => navigation.navigate('SocialNetworks')}>
            <Feather name="twitter" size={24} color={colors.text} />
            <Text style={[styles.socialText, { color: isDark ? '#AAA' : '#555' }]}>X</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialItem} onPress={() => navigation.navigate('SocialNetworks')}>
            <Feather name="facebook" size={24} color="#1877F2" />
            <Text style={[styles.socialText, { color: isDark ? '#AAA' : '#555' }]}>Facebook</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialItem} onPress={() => navigation.navigate('SocialNetworks')}>
            <Feather name="instagram" size={24} color="#E1306C" />
            <Text style={[styles.socialText, { color: isDark ? '#AAA' : '#555' }]}>Instagram</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialItem} onPress={() => navigation.navigate('SocialNetworks')}>
            <Text style={[styles.tiktok, { color: colors.text }]}>♪</Text>
            <Text style={[styles.socialText, { color: isDark ? '#AAA' : '#555' }]}>TikTok</Text>
          </TouchableOpacity>
        </View>

        {/* CONTENIDO */}
        <View style={styles.postsSection}>
          <Text style={[styles.postsTitle, { color: colors.text, opacity:0.5 }]}>
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
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: 22,
    fontFamily: 'Nunito-Bold',
  },
  handle: {
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
    borderWidth: 3,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontFamily: 'Nunito-Bold',
  },
  statLabel: {
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
  },
  socialItem: {
    alignItems: 'center',
  },
  socialText: {
    fontSize: 10,
    marginTop: 6,
  },
  tiktok: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  postsSection: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  postsTitle: {
    textAlign: 'center',
    fontSize: 18,
    paddingTop: 20,
    marginBottom: 20,
    transform: [{ translateY: 120 }],
    fontFamily: 'Nunito-Bold',
  },
});