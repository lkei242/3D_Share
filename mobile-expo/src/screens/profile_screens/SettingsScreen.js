import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import MediaViewerModal from '../chats_screens/Mediaviewer';

export default function SettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';
  const [userData, setUserData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (!user) { setLoading(false); return; }
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (error) {
        console.log('Error cargando datos del usuario:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);
  
  const handleLogout = async () => {
    try {
      await signOut(auth); 
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (error) {
      console.log("Error al cerrar sesión:", error);
    }
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textnegrita }]}>Configuración</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#546F1C" style={{ flex: 1, justifyContent: 'center' }} />
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            {userData?.profilePicture ? (
              <Image
                source={{ uri: userData.profilePicture }}
                style={[styles.avatar, { borderColor: colors.avatarborder, backgroundColor: colors.card }]}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { borderColor: colors.avatarborder, backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                <Ionicons name="person-circle-outline" size={84} color="#94BA46" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('EditProfileInfoScreen')}>
            <Text style={[styles.username, { color: colors.textnegrita }]}>
              {userData?.profileName || 'Usuario'}
            </Text>
          </TouchableOpacity>
        </View>

        {}
        <TouchableOpacity
          style={[styles.option, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('Account')}
        >
          <Text style={[styles.optionText, { color: colors.text }]}>Cuenta</Text>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAA' : '#666'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('Preferences')}
        >
          <Text style={[styles.optionText, { color: colors.text }]}>Preferencias</Text>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAA' : '#666'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('Activity')}
        >
          <Text style={[styles.optionText, { color: colors.text }]}>Tu Actividad</Text>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAA' : '#666'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.botonrojo }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
      )}

      <MediaViewerModal
        visible={modalVisible}
        items={userData?.profilePicture ? [{ id: 'profile', mediaUrl: userData.profilePicture, type: 'image' }] : []}
        initialIndex={0}
        onClose={() => setModalVisible(false)}
        hideCounter
      />
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
    borderWidth: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
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