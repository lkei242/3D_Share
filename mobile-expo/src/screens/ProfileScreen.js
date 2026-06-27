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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from './config/firebase';
import { formatViews } from './config/formatViews';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const { width: screenWidth } = Dimensions.get('window');
const GRID_ITEM_SIZE = (screenWidth - 18) / 3;
const TABS = ['Publicaciones', 'Etiquetas', 'Contactos'];

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [presentation, setPresentation] = useState('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Publicaciones');

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
        setUserUsername(data.username || user.email.split('@')[0]);
        setUserEmail(data.email || user.email);
        setProfilePicture(data.profilePicture || '');
        setPresentation(data.presentation || '');

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
      } else {
        setUserEmail(user.email || '');
        setUserUsername(user.email.split('@')[0]);
        const namePart = user.displayName || user.email.split('@')[0];
        setUserName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
      }
    } catch (error) {
      console.log('Error fetching user profile:', error);
    } finally {
      setProfileLoading(false);
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

  // Contar seguidores y seguidos
  const fetchFollowCounts = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const followersQuery = query(collection(db, 'followers'), where('userId', '==', user.uid));
      const followersSnap = await getDocs(followersQuery);
      setFollowersCount(followersSnap.size);

      const followingQuery = query(collection(db, 'followers'), where('followerId', '==', user.uid));
      const followingSnap = await getDocs(followingQuery);
      setFollowingCount(followingSnap.size);
    } catch (error) {
      console.log('Error fetching follow counts:', error);
    }
  }, []);

  const hasFetched = React.useRef(false);
  useFocusEffect(
      useCallback(() => {
        if (!hasFetched.current) {
          Promise.all([fetchUserProfile(), fetchUserPosts(), fetchFollowCounts()]);
          hasFetched.current = true;
        }
      }, [fetchUserProfile, fetchUserPosts, fetchFollowCounts])
  );

  // Renderizar grid de publicaciones
  const renderGrid = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#9DBD3F" style={{ marginTop: 40 }} />;
    }
    if (posts.length === 0) {
      return (
        <Text style={[styles.emptyText, { color: isDark ? '#666' : '#AAA' }]}>
          Todavía no has publicado nada
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

  // Tarjeta de contacto (estilo UserProfileScreen)
  const renderContactCard = (icon, label, value, onPress, color) => {
    const hasValue = value !== null && value !== '';
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
          <Text
            style={[styles.contactValue, { color: hasValue ? colors.text : (isDark ? '#666' : '#999') }]}
            numberOfLines={1}
          >
            {hasValue ? value : 'No configurado'}
          </Text>
        </View>
        {!hasValue && (
          <View style={[styles.emptyBadge, { backgroundColor: '#9DBD3F' }]}>
            <Ionicons name="add" size={12} color="#FFF" />
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={isDark ? '#666' : '#CCC'} />
      </TouchableOpacity>
    );
  };

  // Botón de red social (estilo UserProfileScreen)
  const renderSocialButton = (platform, iconName, color, iconType = 'Feather') => {
    const url = platform === 'whatsapp'
      ? userContacts.whatsapp
      : userContacts.socialMedia[platform];
    const hasValue = url !== null && url !== '';
    const IconComponent = iconType === 'MaterialCommunity' ? MaterialCommunityIcons : Feather;

    return (
      <TouchableOpacity
        key={platform}
        style={[
          styles.socialButton,
          { backgroundColor: hasValue ? color + '15' : (isDark ? '#2A2A2A' : '#F5F5F5') },
        ]}
        onPress={() => navigation.navigate('SocialNetworks')}
        activeOpacity={0.7}
      >
        <View style={styles.socialIconContainer}>
          <IconComponent
            name={iconName}
            size={28}
            color={hasValue ? color : (isDark ? '#555' : '#BBB')}
          />
          {!hasValue && (
            <View style={styles.emptyBadgeSmall}>
              <Ionicons name="add" size={10} color="#FFF" />
            </View>
          )}
        </View>
        <Text
          style={[
            styles.socialButtonText,
            { color: hasValue ? colors.text : (isDark ? '#666' : '#999') },
          ]}
        >
          {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </Text>
        <Text
          style={[
            styles.socialStatusText,
            { color: hasValue ? color : (isDark ? '#555' : '#BBB') },
          ]}
        >
          {hasValue ? 'Configurado' : 'Agregar'}
        </Text>
      </TouchableOpacity>
    );
  };

  // Renderizar pestaña de contactos
  const renderContactsTab = () => {
    const hasAnyContact =
      userContacts.whatsapp ||
      userContacts.email ||
      userContacts.phone ||
      userContacts.website ||
      userContacts.location ||
      Object.values(userContacts.socialMedia).some(v => v !== null);

    return (
      <View style={styles.contactsContainer}>
        {/* Redes sociales */}
        <View style={styles.contactsSection}>
          <Text style={[styles.contactsSectionTitle, { color: colors.text }]}>
            Redes sociales
          </Text>
          <Text style={[styles.contactsSectionSubtitle, { color: isDark ? '#888' : '#777' }]}>
            Toca para agregar o editar tus enlaces
          </Text>

          <View style={styles.socialGrid}>
            {renderSocialButton('instagram', 'instagram', '#E1306C')}
            {renderSocialButton('facebook', 'facebook', '#1877F2')}
            {renderSocialButton('twitter', 'twitter', '#1DA1F2')}
            {renderSocialButton('tiktok', 'music-note', '#000000', 'MaterialCommunity')}
            {renderSocialButton('linkedin', 'linkedin', '#0A66C2')}
            {renderSocialButton('whatsapp', 'whatsapp', '#25D366', 'MaterialCommunity')}
          </View>
        </View>
      </View>
    );
  };

  // Renderizar contenido según la pestaña activa
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Publicaciones':
        return renderGrid();
      case 'Contactos':
        return renderContactsTab();
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
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 6,
            backgroundColor: colors.background,
            borderBottomColor: isDark ? '#222' : '#E8E8E8',
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('AccountSwitcher')}
          style={styles.headerCenter}
        >
          <Text style={[styles.headerUsername, { color: colors.text }]} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={[styles.headerHandle, { color: isDark ? '#888' : '#666' }]}>
            @{userUsername}
          </Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
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
            <View style={[styles.avatarWrapper, { borderColor: isDark ? '#222' : '#E0E0E0' }]}>
              {profileLoading ? null : profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' },
                  ]}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={90}
                    color="#94BA46"
                    style={{ marginLeft: -3, marginTop: -4 }}
                  />
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statsNumbers}>
                <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('Publicaciones')}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {posts.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>
                    Publicaciones
                  </Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Contacts', { initialTab: 0 })}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {followersCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>
                    Seguidores
                  </Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Contacts', { initialTab: 1 })}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {followingCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>
                    Seguidos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Bio / Presentación */}
          {presentation && presentation.trim().length > 0 ? (
            <Text style={[styles.bioText, { color: isDark ? '#BBB' : '#555' }]}>
              {presentation}
            </Text>
          ) : null}

          {/* Botones acción */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('EditProfileInfoScreen')}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnPrimaryText}>Editar perfil</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.8}>
              <Feather
                name="share-2"
                size={16}
                color={isDark ? '#FFF' : '#333'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.btnSecondaryText, { color: isDark ? '#FFF' : '#333' }]}>
                Compartir
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TABS */}
        <View style={[styles.tabsContainer, { borderBottomColor: isDark ? '#2A2A2A' : '#E0E0E0' }]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { borderBottomColor: '#9DBD3F' }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? '#9DBD3F' : (isDark ? '#666' : '#999') },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CONTENIDO DEL TAB */}
        <View style={styles.tabContent}>{renderTabContent()}</View>
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
  headerCenter: {
    flex: 1,
    
    marginHorizontal: 8,
  },
  headerUsername: {
    fontSize: 16,
    fontFamily: 'Nunito-BoldItalic',
  },
  headerHandle: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    marginTop: 1,
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
    marginBottom: 3,
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
  // BIO
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
  // TABS
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 5,
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
    paddingTop: 4,
    minHeight: 300,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3.5,
    marginLeft:0.5,
    marginTop: 2,
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
  // CONTACTOS (estilo UserProfileScreen)
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
    marginBottom: 4,
    marginLeft: 4,
  },
  contactsSectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
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
  // REDES SOCIALES (estilo UserProfileScreen)
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
  socialIconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  emptyBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  emptyBadgeSmall: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#9DBD3F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  socialButtonText: {
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
    marginTop: 4,
  },
  socialStatusText: {
    fontSize: 11,
    fontFamily: 'Nunito-Regular',
    marginTop: 2,
  },
});