// src/screens/ProfileScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { auth, db } from './config/firebase';
import { formatViews } from './config/formatViews';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const { width: screenWidth } = Dimensions.get('window');
const GRID_ITEM_SIZE = (screenWidth - 20) / 3;

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [presentation, setPresentation] = useState('');

  const handlePostPress = (post) => {
    navigation.navigate('PostDetail', { post, posts });
  };

  // Cargar perfil dinámico desde Firestore
  const fetchUserProfile = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserName(data.profileName || data.username || user.email.split('@')[0]);
        setUserEmail(data.email || user.email);
        setProfilePicture(data.profilePicture || '');
        setPresentation(data.presentation || '');
      } else {
        // Fallback
        setUserEmail(user.email || '');
        const namePart = user.displayName || user.email.split('@')[0];
        setUserName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
      }
    } catch (error) {
      console.log('Error fetching user profile:', error);
    }
  }, []);

  // Obtener posts del usuario desde Firestore
  const fetchUserPosts = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        where('autor', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const postsFormateados = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().titulo || 'Sin título',
        image: doc.data().imagenes && doc.data().imagenes.length > 0
          ? doc.data().imagenes[0]
          : 'https://picsum.photos/seed/placeholder/400/300',
        price: doc.data().precio ? `${doc.data().precio}$` : null,
        views: formatViews(doc.data().vistas || 0),
        totalImages: doc.data().imagenes ? doc.data().imagenes.length : 1,
        description: doc.data().descripcion || '',
        author: doc.data().autor,
      }));
      setPosts(postsFormateados);
    } catch (error) {
      console.log('Error al cargar publicaciones de usuario:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga/Recarga completa en cada focus de pestaña
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
      fetchUserPosts();
    }, [fetchUserProfile, fetchUserPosts])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>

        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.navigate('AccountSwitcher')}>
            <Text style={[styles.username, { color: colors.text }]}>
              {userName}
            </Text>
            <Text style={[styles.handle, { color: isDark ? '#999' : '#666' }]}>
              @{userEmail ? userEmail.split('@')[0] : 'usuario'}
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
          <View style={[styles.avatar, { borderColor: colors.avatarborder }]}>
            <Image
              source={profilePicture ? { uri: profilePicture } : require('../../assets/profile_picture.jpg')}
              style={styles.avatarImage}
            />
          </View>

          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Contacts')}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {posts.length}
              </Text>
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

        {/* BIO / PRESENTACIÓN */}
        {presentation ? (
          <View style={styles.bioContainer}>
            <Text style={[styles.bioText, { color: colors.text }]}>{presentation}</Text>
          </View>
        ) : null}

        {/* BOTONES */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('EditProfileInfoScreen')}>
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
          {loading ? (
            <ActivityIndicator size="large" color="#546F1C" style={{ marginTop: 40 }} />
          ) : posts.length === 0 ? (
            <Text style={[styles.postsTitle, { color: colors.text, opacity: 0.5 }]}>
              Todavía no has publicado nada
            </Text>
          ) : (
            <View style={styles.gridContainer}>
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.gridItem}
                  activeOpacity={0.8}
                  onPress={() => handlePostPress(post)}
                >
                  <Image source={{ uri: post.image }} style={styles.gridImage} />
                  {post.price && (
                    <View style={styles.gridPriceTag}>
                      <Text style={styles.gridPriceText}>{post.price}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  bioContainer: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    lineHeight: 18,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
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
    paddingHorizontal: 5.69,
  },
  postsTitle: {
    textAlign: 'center',
    fontSize: 18,
    paddingTop: 20,
    marginBottom: 20,
    transform: [{ translateY: 120 }],
    fontFamily: 'Nunito-Bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 7,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#333',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPriceTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  gridPriceText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Nunito-Bold',
  },
});