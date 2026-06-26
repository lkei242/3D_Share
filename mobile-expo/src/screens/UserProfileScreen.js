// src/screens/UserProfileScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { auth, db } from './config/firebase';
import { formatViews } from './config/formatViews';
import { doc, getDoc, collection, query, where, orderBy, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

const { width: screenWidth } = Dimensions.get('window');
const GRID_ITEM_SIZE = (screenWidth - 20) / 3;

const TABS = ['Publicaciones', 'Videos', 'Etiquetas'];

export default function UserProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const { userId, profileName, username, profilePicture } = route.params;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [presentation, setPresentation] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('Publicaciones');
  const currentUser = auth.currentUser;

  const handlePostPress = (post) => {
    navigation.navigate('PostDetail', { post, posts });
  };

  const fetchUserProfile = useCallback(async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setPresentation(data.presentation || '');
      }
    } catch (error) {
      console.log('Error fetching user profile:', error);
    }
  }, [userId]);

  const fetchUserPosts = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        where('autor', '==', userId),
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
      console.log('Error al cargar publicaciones:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const checkFollowing = useCallback(async () => {
    if (!currentUser || currentUser.uid === userId) return;
    try {
      const followRef = doc(db, 'followers', `${userId}_${currentUser.uid}`);
      const followDoc = await getDoc(followRef);
      setIsFollowing(followDoc.exists());
    } catch (error) {
      console.log('Error checking follow status:', error);
    }
  }, [userId, currentUser]);

  const fetchFollowersCount = useCallback(async () => {
    try {
      const q = query(collection(db, 'followers'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      setFollowersCount(snapshot.size);
    } catch (error) {
      console.log('Error fetching followers count:', error);
    }
  }, [userId]);

  const handleFollow = async () => {
    if (!currentUser) return;
    try {
      const followRef = doc(db, 'followers', `${userId}_${currentUser.uid}`);
      if (isFollowing) {
        await deleteDoc(followRef);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await setDoc(followRef, {
          userId: userId,
          followerId: currentUser.uid,
          createdAt: new Date(),
        });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.log('Error following/unfollowing:', error);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchUserPosts();
    checkFollowing();
    fetchFollowersCount();
  }, [fetchUserProfile, fetchUserPosts, checkFollowing, fetchFollowersCount]);

  const renderGrid = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#9DBD3F" style={{ marginTop: 40 }} />;
    }
    if (posts.length === 0) {
      return (
        <Text style={[styles.emptyText, { color: isDark ? '#666' : '#AAA' }]}>
          Sin publicaciones aún
        </Text>
      );
    }
    return (
      <View style={styles.gridContainer}>
        {posts.map((post) => (
          <TouchableOpacity
            key={post.id}
            style={styles.gridItem}
            activeOpacity={0.85}
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
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Publicaciones':
        return renderGrid();
      case 'Videos':
        return (
          <Text style={[styles.emptyText, { color: isDark ? '#666' : '#AAA' }]}>
            Sin videos aún
          </Text>
        );
      case 'Etiquetas':
        return (
          <Text style={[styles.emptyText, { color: isDark ? '#666' : '#AAA' }]}>
            Sin etiquetas aún
          </Text>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* HEADER FIJO */}
      <View style={[
        styles.header,
        {
          paddingTop: insets.top + 6,
          backgroundColor: colors.background,
          borderBottomColor: isDark ? '#222' : '#E8E8E8',
        }
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerUsername, { color: colors.text }]} numberOfLines={1}>
          @{username}
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Feather name="more-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* SECCIÓN PERFIL */}
        <View style={styles.profileSection}>

          {/* Fila: avatar + stats */}
          <View style={styles.avatarStatsRow}>
            <View style={[styles.avatarWrapper, { borderColor: '#9DBD3F' }]}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
              ) : (
              <View style={[styles.avatarFallback, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                  <Ionicons
                    name="person-circle-outline"
                    size={90}
                    color={isDark ? '#888' : '#999'}
                  />
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{posts.length}</Text>
                <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>Publicaciones</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
              <TouchableOpacity style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{friendsCount}</Text>
                <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>Amigos</Text>
              </TouchableOpacity>
              <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
              <TouchableOpacity style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{followersCount}</Text>
                <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>Seguidores</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Nombre */}
          <Text style={[styles.profileName, { color: colors.text }]}>{profileName}</Text>

          {/* Bio */}
          {presentation ? (
            <Text style={[styles.bioText, { color: isDark ? '#BBB' : '#555' }]}>
              {presentation}
            </Text>
          ) : null}

          {/* Botones acción */}
          {currentUser?.uid !== userId ? (
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[styles.btnPrimary, isFollowing && styles.btnFollowing]}
                onPress={handleFollow}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFollowing ? 'checkmark' : 'person-add-outline'}
                  size={16}
                  color="#FFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.btnPrimaryText}>
                  {isFollowing ? 'Siguiendo' : 'Seguir'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.8}>
                <Feather name="message-circle" size={16} color={isDark ? '#FFF' : '#333'} style={{ marginRight: 6 }} />
                <Text style={[styles.btnSecondaryText, { color: isDark ? '#FFF' : '#333' }]}>
                  Mensaje
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btnIcon, { backgroundColor: isDark ? '#2A2A2A' : '#EFEFEF' }]} activeOpacity={0.8}>
                <Feather name="share-2" size={18} color={isDark ? '#FFF' : '#333'} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* TABS */}
        <View style={[styles.tabsContainer, { borderBottomColor: isDark ? '#2A2A2A' : '#E0E0E0' }]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { borderBottomColor: '#9DBD3F' }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? '#9DBD3F' : (isDark ? '#666' : '#999') }
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CONTENIDO DEL TAB */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 6,
  },
  headerUsername: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // PERFIL
  profileSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  avatarStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    overflow: 'hidden',
    marginRight: 20,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Nunito-Regular',
    marginTop: 3,
    textAlign: 'center',
  },

  // NOMBRE Y BIO
  profileName: {
    fontSize: 17,
    fontFamily: 'Nunito-Bold',
    marginBottom: 6,
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    lineHeight: 20,
    marginBottom: 16,
  },

  // BOTONES
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9DBD3F',
    borderRadius: 10,
    paddingVertical: 10,
  },
  btnFollowing: {
    backgroundColor: '#444',
  },
  btnPrimaryText: {
    color: '#FFF',
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#9DBD3F',
  },
  btnSecondaryText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
  },
  btnIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // TABS
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
  },

  // CONTENIDO
  tabContent: {
    paddingHorizontal: 5,
    paddingTop: 6,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 6,
    overflow: 'hidden',
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
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  gridPriceText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Nunito-Bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 60,
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
  },
});