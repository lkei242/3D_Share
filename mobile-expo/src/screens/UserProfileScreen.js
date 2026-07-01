// src/screens/UserProfileScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Image,
  ActivityIndicator,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from './config/firebase';
import { formatViews } from './config/formatViews';
import { doc, getDoc, collection, query, where, orderBy, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { checkIfFollowing, followUser, unfollowUser, getFollowersCount, checkIfBlocked, blockUser, unblockUser } from './config/userActions';

const { width: screenWidth } = Dimensions.get('window');
const GRID_ITEM_SIZE = (screenWidth - 20) / 3;
const TABS = ['Publicaciones', 'Etiquetas', 'Contactos'];

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
  const [followingCount, setFollowingCount] = useState(0);
  const [activeTab, setActiveTab] = useState('Publicaciones');
  const [isBlocked, setIsBlocked] = useState(false);
  const [pinnedPosts, setPinnedPosts] = useState([]);
  const [userContacts, setUserContacts] = useState({
    whatsapp: null,
    email: null,
    phone: null,
    website: null,
    location: null,
    socialMedia: {
      instagram: null,
      facebook: null,
      twitter: null,
      tiktok: null,
      linkedin: null,
    },
  });

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
        setPinnedPosts(data.pinnedPosts || []);
        
        // Cargar contactos del usuario
        if (data.contacts) {
          setUserContacts({
            whatsapp: data.contacts.whatsapp || null,
            email: data.contacts.email || null,
            phone: data.contacts.phone || null,
            website: data.contacts.website || null,
            location: data.contacts.location || null,
            socialMedia: {
              instagram: data.contacts.socialMedia?.instagram || null,
              facebook: data.contacts.socialMedia?.facebook || null,
              twitter: data.contacts.socialMedia?.twitter || null,
              tiktok: data.contacts.socialMedia?.tiktok || null,
              linkedin: data.contacts.socialMedia?.linkedin || null,
            },
          });
        }
      }
    } catch (error) {
      console.log('Error fetching user profile:', error);
    }
  }, [userId]);

  const fetchUserPosts = useCallback(async () => {
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : {};

      const q = query(
        collection(db, 'posts'),
        where('autor', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const postsFormateados = snapshot.docs.map(d => ({
        id: d.id,
        title: d.data().titulo || 'Sin título',
        image: d.data().imagenes && d.data().imagenes.length > 0
          ? d.data().imagenes[0]
          : 'https://picsum.photos/seed/placeholder/400/300',
        price: d.data().precio ? `${d.data().precio}$` : null,
        views: formatViews(d.data().vistas || 0),
        totalImages: d.data().imagenes ? d.data().imagenes.length : 1,
        description: d.data().descripcion || '',
        author: d.data().autor,
        authorProfileName: userData.profileName || userData.username || 'Usuario',
        authorUsername: userData.username || 'usuario',
        authorProfilePicture: userData.profilePicture || '',
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
    const following = await checkIfFollowing(currentUser.uid, userId);
    setIsFollowing(following);
  }, [userId, currentUser]);

  const fetchFollowersCount = useCallback(async () => {
    const count = await getFollowersCount(userId);
    setFollowersCount(count);
  }, [userId]);

  const fetchFollowingCount = useCallback(async () => {
    if (!userId) return;
    try {
      const q = query(collection(db, 'followers'), where('followerId', '==', userId));
      const snapshot = await getDocs(q);
      setFollowingCount(snapshot.size);
    } catch (error) {
      console.log('Error fetching following count:', error);
    }
  }, [userId]);

  const handleFollow = async () => {
    if (!currentUser) return;
    if (isFollowing) {
      setIsFollowing(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
      const ok = await unfollowUser(currentUser.uid, userId);
      if (!ok) {
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } else {
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      const ok = await followUser(currentUser.uid, userId);
      if (!ok) {
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const fetchBlocked = useCallback(async () => {
    if (!currentUser) return;
    const blocked = await checkIfBlocked(currentUser.uid, userId);
    setIsBlocked(blocked);
  }, [currentUser?.uid, userId]);

  const handleBlock = () => {
    if (isBlocked) {
      Alert.alert(
        'Desbloquear usuario',
        `¿Querés desbloquear a ${profileName}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desbloquear',
            onPress: async () => {
              setIsBlocked(false);
              const ok = await unblockUser(currentUser.uid, userId);
              if (!ok) setIsBlocked(true);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Bloquear usuario',
        `¿Querés bloquear a ${profileName}? No verás sus publicaciones ni podrán interactuar.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Bloquear',
            style: 'destructive',
            onPress: async () => {
              setIsBlocked(true);
              let wasFollowing = isFollowing;
              if (isFollowing) {
                setIsFollowing(false);
                setFollowersCount(prev => Math.max(0, prev - 1));
              }
              const ok = await blockUser(currentUser.uid, userId);
              if (!ok) {
                setIsBlocked(false);
                if (wasFollowing) {
                  setIsFollowing(true);
                  setFollowersCount(prev => prev + 1);
                }
                return;
              }
              if (wasFollowing) {
                await unfollowUser(currentUser.uid, userId);
              }
            },
          },
        ]
      );
    }
  };

  // Funciones para manejar contactos
  const handleWhatsApp = () => {
    if (userContacts.whatsapp) {
      const phone = userContacts.whatsapp.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const handleEmail = () => {
    if (userContacts.email) {
      Linking.openURL(`mailto:${userContacts.email}`);
    }
  };

  const handlePhone = () => {
    if (userContacts.phone) {
      Linking.openURL(`tel:${userContacts.phone}`);
    }
  };

  const handleWebsite = () => {
    if (userContacts.website) {
      const url = userContacts.website.startsWith('http') 
        ? userContacts.website 
        : `https://${userContacts.website}`;
      Linking.openURL(url);
    }
  };

  const handleSocialMedia = (platform) => {
    const url = userContacts.socialMedia[platform];
    if (url) {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      Linking.openURL(fullUrl);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchUserPosts();
    checkFollowing();
    fetchFollowersCount();
    fetchFollowingCount();
    fetchBlocked();
  }, [fetchUserProfile, fetchUserPosts, checkFollowing, fetchFollowersCount, fetchFollowingCount, fetchBlocked]);

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
    const pinned = posts.filter(p => pinnedPosts.includes(p.id));
    const unpinned = posts.filter(p => !pinnedPosts.includes(p.id));
    const sorted = [...pinned, ...unpinned];
    return (
      <View style={styles.gridContainer}>
        {sorted.map((post) => {
          const isPinned = pinnedPosts.includes(post.id);
          return (
            <TouchableOpacity
              key={post.id}
              style={styles.gridItem}
              activeOpacity={0.85}
              onPress={() => handlePostPress(post)}
            >
              <Image source={{ uri: post.image }} style={styles.gridImage} />
              {isPinned && (
                <View style={styles.pinBadge}>
                  <MaterialCommunityIcons name="pin" size={12} color="#FFF" />
                </View>
              )}
              {post.price && (
                <View style={styles.gridPriceTag}>
                  <Text style={styles.gridPriceText}>{post.price}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderContactCard = (icon, label, value, onPress, color) => {
    if (!value) return null;
    
    return (
      <TouchableOpacity
        style={[styles.contactCard, { backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8' }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.contactIconWrapper, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactLabel, { color: isDark ? '#AAA' : '#666' }]}>
            {label}
          </Text>
          <Text style={[styles.contactValue, { color: colors.text }]} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isDark ? '#666' : '#CCC'} />
      </TouchableOpacity>
    );
  };

  const renderSocialButton = (platform, iconName, color, iconType = 'Feather') => {
    const url = userContacts.socialMedia[platform];
    if (!url) return null;

    const IconComponent = iconType === 'MaterialCommunity' ? MaterialCommunityIcons : Feather;

    return (
      <TouchableOpacity
        key={platform}
        style={[styles.socialButton, { backgroundColor: color + '15' }]}
        onPress={() => handleSocialMedia(platform)}
        activeOpacity={0.7}
      >
        <IconComponent name={iconName} size={28} color={color} />
        <Text style={[styles.socialButtonText, { color: colors.text }]}>
          {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Publicaciones':
        return renderGrid();
      
      case 'Contactos':
        const hasContacts = userContacts.whatsapp || userContacts.email || 
                           userContacts.phone || userContacts.website || 
                           userContacts.location ||
                           Object.values(userContacts.socialMedia).some(v => v !== null);

        if (!hasContacts) {
          return (
            <View style={styles.emptyContactsContainer}>
              <Ionicons 
                name="people-outline" 
                size={80} 
                color={isDark ? '#444' : '#DDD'} 
              />
              <Text style={[styles.emptyContactsTitle, { color: isDark ? '#888' : '#999' }]}>
                Sin información de contacto
              </Text>
              <Text style={[styles.emptyContactsSubtitle, { color: isDark ? '#666' : '#AAA' }]}>
                Este usuario aún no ha compartido sus datos de contacto
              </Text>
            </View>
          );
        }

        return (
          <View style={styles.contactsContainer}>
            {/* Información de contacto directa */}
            {(userContacts.phone || userContacts.email || userContacts.whatsapp || userContacts.website || userContacts.location) && (
              <View style={styles.contactsSection}>
                <Text style={[styles.contactsSectionTitle, { color: colors.text }]}>
                  Información de contacto
                </Text>
                
                {renderContactCard(
                  <Feather name="phone" size={22} color="#4CAF50" />,
                  'Teléfono',
                  userContacts.phone,
                  handlePhone,
                  '#4CAF50'
                )}
                
                {renderContactCard(
                  <Feather name="mail" size={22} color="#2196F3" />,
                  'Email',
                  userContacts.email,
                  handleEmail,
                  '#2196F3'
                )}
                
                {renderContactCard(
                  <MaterialCommunityIcons name="whatsapp" size={22} color="#25D366" />,
                  'WhatsApp',
                  userContacts.whatsapp,
                  handleWhatsApp,
                  '#25D366'
                )}
                
                {renderContactCard(
                  <Feather name="globe" size={22} color="#FF9800" />,
                  'Sitio web',
                  userContacts.website,
                  handleWebsite,
                  '#FF9800'
                )}
                
                {renderContactCard(
                  <Feather name="map-pin" size={22} color="#E91E63" />,
                  'Ubicación',
                  userContacts.location,
                  () => {
                    if (userContacts.location) {
                      const encodedLocation = encodeURIComponent(userContacts.location);
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`);
                    }
                  },
                  '#E91E63'
                )}
              </View>
            )}

            {/* Redes sociales */}
            {Object.values(userContacts.socialMedia).some(v => v !== null) && (
              <View style={styles.contactsSection}>
                <Text style={[styles.contactsSectionTitle, { color: colors.text }]}>
                  Redes sociales
                </Text>
                
                <View style={styles.socialGrid}>
                  {renderSocialButton('instagram', 'instagram', '#E1306C')}
                  {renderSocialButton('facebook', 'facebook', '#1877F2')}
                  {renderSocialButton('twitter', 'twitter', '#1DA1F2')}
                  {renderSocialButton('tiktok', 'music-note', '#000000', 'MaterialCommunity')}
                  {renderSocialButton('linkedin', 'linkedin', '#0A66C2')}
                </View>
              </View>
            )}
          </View>
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
          {profileName}
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleBlock}>
            <Feather name="more-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={[{ data: [1], key: 'content' }]}
        stickySectionHeadersEnabled
        removeClippedSubviews={false}
        keyExtractor={(_, i) => String(i)}
        ListHeaderComponent={() => (
          <View style={styles.profileSection}>
            {/* Fila: avatar + stats */}
            <View style={styles.avatarStatsRow}>
              <View style={[styles.avatarWrapper, { borderColor: isDark ? '#222' : '#E0E0E0' }]}>
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                    <Ionicons
                      name="person-circle-outline"
                      size={90}
                      color="#94BA46"
                      style={{
                        marginLeft: -3,
                        marginTop: -4,
                      }}
                    />
                  </View>
                )}
              </View>

              <View style={styles.statsRow}>
                <Text style={[styles.userHandle, { color: isDark ? '#888' : '#666' }]}>@{username}</Text>
                <View style={styles.statsNumbers}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: colors.text }]}>{posts.length}</Text>
                    <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>Publicaciones</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                  <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('UserProfileContacts', { userId, profileName, initialTab: 1 })}>
                    <Text style={[styles.statNumber, { color: colors.text }]}>{followersCount}</Text>
                    <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>Seguidores</Text>
                  </TouchableOpacity>
                  <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                  <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('UserProfileContacts', { userId, profileName, initialTab: 2 })}>
                    <Text style={[styles.statNumber, { color: colors.text }]}>{followingCount}</Text>
                    <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>Seguidos</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Nombre y Bio (solo si hay presentación) */}
            {presentation && presentation.trim().length > 0 ? (
              <>
                <Text style={[styles.bioText, { color: isDark ? '#BBB' : '#555' }]}>
                  {presentation}
                </Text>
              </>
            ) : null}

            {/* Botones acción */}
            {currentUser?.uid !== userId ? (
              isBlocked ? (
                <View style={styles.buttonsRow}>
                  <View style={[styles.btnBlocked, { backgroundColor: isDark ? '#3A2020' : '#FFE0E0' }]}>
                    <Ionicons name="ban-outline" size={16} color="#E53935" style={{ marginRight: 6 }} />
                    <Text style={[styles.btnBlockedText, { color: '#E53935' }]}>
                      Bloqueado
                    </Text>
                  </View>
                </View>
              ) : (
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
              )
            ) : null}
          </View>
        )}
        renderSectionHeader={() => (
          <View style={{ backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: isDark ? '#2A2A2A' : '#E0E0E0', paddingTop: 5 }}>
            <View style={styles.tabsContainer}>
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
          </View>
        )}
        renderItem={() => (
          <View style={styles.tabContent}>{renderTabContent()}</View>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
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
    marginLeft: 18,
    fontSize: 16,
    fontFamily: 'Nunito-BoldItalic',
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
    marginRight: 1,
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
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  statsNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 4,
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
  userHandle: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
    marginBottom: 2,
    marginLeft: 10,
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
  btnBlocked: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
  },
  btnBlockedText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
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
  pinBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#546F1C',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  // CONTACTOS MEJORADOS
  contactsContainer: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  contactsSection: {
    marginBottom: 24,
  },
  contactsSectionTitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  contactIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  socialButton: {
    width: (screenWidth - 60) / 3,
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  socialButtonText: {
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
    marginTop: 8,
  },
  emptyContactsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyContactsTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyContactsSubtitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 60,
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
  },
});