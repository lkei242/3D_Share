// src/screens/ProfileScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert,
  FlatList,
  Share,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { auth, db } from './config/firebase';
import { formatViews } from './config/formatViews';
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useVideoPlayer, VideoView } from 'expo-video';
import MediaViewerModal from './chats_screens/Mediaviewer';

const { width: screenWidth } = Dimensions.get('window');
const GRID_ITEM_SIZE = (screenWidth - 18) / 3;
const TABS = ['Publicaciones', 'Contactos'];

// ============================================================
// 🆕 COMPONENTE: VideoPreview (autoplay muted, loop)
// ============================================================
const VideoPreview = React.memo(function VideoPreview({ uri, isVisible }) {
  const player = useVideoPlayer(uri, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
  });

  useEffect(() => {
    if (isVisible) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible]);

  return (
    <VideoView
      player={player}
      style={styles.gridImage}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
      nativeControls={false}
    />
  );
});

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [presentation, setPresentation] = useState('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Publicaciones');
  const [pinnedPosts, setPinnedPosts] = useState([]);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [visibleItems, setVisibleItems] = useState(new Set()); // 🆕 Trackear visibles

  const [otherProfiles, setOtherProfiles] = useState([]);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editingProfileIndex, setEditingProfileIndex] = useState(null);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileUrlInput, setProfileUrlInput] = useState('');
  const [addingProfile, setAddingProfile] = useState(false);

  const [socialModalVisible, setSocialModalVisible] = useState(false);
  const [editingSocialPlatform, setEditingSocialPlatform] = useState(null);
  const [socialInputValue, setSocialInputValue] = useState('');
  
  const [userContacts, setUserContacts] = useState({
    whatsapp: null,
    email: null,
    phone: null,
    website: null,
    location: null,
    socialMedia: {
      instagram: null,
      facebook: null,
      telegram: null,
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
        setPinnedPosts(data.pinnedPosts || []);

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
              telegram: data.contacts.socialMedia?.telegram || null,
            },
          });
          setOtherProfiles(data.contacts?.otherProfiles || []);
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
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const authorName = userData.profileName || userData.username || 'Usuario';
      const authorUsername = userData.username || 'usuario';
      const authorPicture = userData.profilePicture || '';

      const q = query(
        collection(db, 'posts'),
        where('autor', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const postsFormateados = snapshot.docs.map(doc => {
        const data = doc.data();
        const mediaArray = data.media || (data.imagenes || []).map(url => ({ url, type: 'image' }));
        return {
          id: doc.id,
          title: data.titulo || 'Sin título',
          image: mediaArray.length > 0 ? mediaArray[0].url : 'https://picsum.photos/seed/placeholder/400/300',
          price: data.precio ? `${data.precio}$` : null,
          views: formatViews(data.vistas || 0),
          totalImages: mediaArray.length,
          media: mediaArray,
          hasVideo: mediaArray.some(m => m.type === 'video'),
          description: data.descripcion || '',
          webLink: data.webLink || '',
          author: data.autor,
          authorProfileName: authorName,
          authorUsername: authorUsername,
          authorProfilePicture: authorPicture,
        };
      });
      setPosts(postsFormateados);
    } catch (error) {
      console.log('Error al cargar publicaciones de usuario:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchUserProfile(), fetchUserPosts(), fetchFollowCounts()]);
    setRefreshing(false);
  };

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

  useFocusEffect(
    useCallback(() => {
      Promise.all([fetchUserProfile(), fetchUserPosts(), fetchFollowCounts()]);
    }, [fetchUserProfile, fetchUserPosts, fetchFollowCounts])
  );

  const handleTogglePin = async (postId) => {
    const user = auth.currentUser;
    if (!user) return;
    const isPinned = pinnedPosts.includes(postId);
    let newPinned;
    if (isPinned) {
      newPinned = pinnedPosts.filter(id => id !== postId);
    } else {
      if (pinnedPosts.length >= 3) {
        Alert.alert('Límite alcanzado', 'Solo podés fijar hasta 3 publicaciones.');
        return;
      }
      newPinned = [...pinnedPosts, postId];
    }
    try {
      await setDoc(doc(db, 'users', user.uid), { pinnedPosts: newPinned }, { merge: true });
      setPinnedPosts(newPinned);
    } catch (error) {
      console.log('Error al fijar publicación:', error);
    }
  };

  // 🆕 Detectar qué items son visibles (para autoplay)
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const visibleIds = new Set(viewableItems.map(item => item.item.id));
    setVisibleItems(visibleIds);
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  });

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

    const pinned = posts.filter(p => pinnedPosts.includes(p.id));
    const unpinned = posts.filter(p => !pinnedPosts.includes(p.id));
    const sorted = [...pinned, ...unpinned];

    // 🆕 Convertir a FlatList para usar onViewableItemsChanged
    return (
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item, index }) => {
          const isPinned = pinnedPosts.includes(item.id);
          const firstMedia = item.media[0];
          const isFirstMediaVideo = firstMedia?.type === 'video';
          const isVisible = visibleItems.has(item.id);

          const column = (index % 3) + 1; // 1, 2, 3

          return (
            <TouchableOpacity
              style={[
                styles.gridItem,
                column === 1 && { marginLeft: 1.5 }, // 👈 primera columna (izquierda)
              ]}
              activeOpacity={0.85}
              onPress={() => handlePostPress(item)}
              onLongPress={() => {
                Alert.alert(
                  isPinned ? 'Desfijar publicación' : 'Fijar publicación',
                  isPinned
                    ? '¿Querés sacar esta publicación de las fijadas?'
                    : '¿Querés fijar esta publicación en tu perfil?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: isPinned ? 'Desfijar' : 'Fijar',
                      onPress: () => handleTogglePin(item.id),
                    },
                  ]
                );
              }}
            >
              {isFirstMediaVideo ? (
                <VideoPreview uri={firstMedia.url} isVisible={isVisible} />
              ) : (
                <Image source={{ uri: item.image }} style={styles.gridImage} />
              )}

              {isFirstMediaVideo && (
                <View style={styles.videoBadge}>
                  <MaterialCommunityIcons name="video" size={12} color="#FFF" />
                </View>
              )}

              {isPinned && (
                <View style={styles.pinBadge}>
                  <MaterialCommunityIcons name="pin" size={12} color="#FFF" />
                </View>
              )}

              {item.price && (
                <View style={styles.gridPriceTag}>
                  <Text style={styles.gridPriceText}>{item.price}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        // 🆕 Detectar items visibles
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
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
  const handleWhatsApp = () => {
    if (userContacts.whatsapp) {
      const phone = userContacts.whatsapp.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() => {
        Alert.alert('Error', 'No se pudo abrir WhatsApp. ¿Está instalado?');
      });
    }
  };

  const handleSocialMedia = (platform) => {
    const url = userContacts.socialMedia[platform];
    if (url) {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      Linking.openURL(fullUrl).catch(() => {
        Alert.alert('Error', 'No se pudo abrir el enlace.');
      });
    }
  };

  const getSocialValue = (platform) =>
    platform === 'whatsapp' ? userContacts.whatsapp : userContacts.socialMedia[platform];

  const openSocialEdit = (platform) => {
    setEditingSocialPlatform(platform);
    setSocialInputValue(getSocialValue(platform) || '');
    setSocialModalVisible(true);
  };

  const saveSocialContacts = async (updatedContacts) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const existing = snap.exists() ? snap.data() : {};
      await setDoc(userRef, {
        ...existing,
        contacts: {
          ...existing.contacts,
          whatsapp: updatedContacts.whatsapp,
          socialMedia: updatedContacts.socialMedia,
        },
      });
    } catch (error) {
      console.log('Error guardando redes sociales:', error);
      Alert.alert('Error', 'No se pudo guardar el cambio. Intentá de nuevo.');
    }
  };

  const handleSaveSocial = async () => {
    const value = socialInputValue.trim();
    const platform = editingSocialPlatform;

    let updatedContacts;
    if (platform === 'whatsapp') {
      updatedContacts = { ...userContacts, whatsapp: value || null };
    } else {
      updatedContacts = {
        ...userContacts,
        socialMedia: { ...userContacts.socialMedia, [platform]: value || null },
      };
    }

    setUserContacts(updatedContacts);
    setSocialModalVisible(false);
    await saveSocialContacts(updatedContacts);
  };

  const handleDeleteSocial = async () => {
    const platform = editingSocialPlatform;
    let updatedContacts;
    if (platform === 'whatsapp') {
      updatedContacts = { ...userContacts, whatsapp: null };
    } else {
      updatedContacts = {
        ...userContacts,
        socialMedia: { ...userContacts.socialMedia, [platform]: null },
      };
    }

    setUserContacts(updatedContacts);
    setSocialModalVisible(false);
    await saveSocialContacts(updatedContacts);
  };

  const handleSocialButtonPress = (platform) => {
    const hasValue = !!getSocialValue(platform);

    if (!hasValue) {
      // Si no está configurado, abrimos el modal para agregarlo
      openSocialEdit(platform);
      return;
    }

    if (platform === 'whatsapp') {
      handleWhatsApp();
    } else {
      handleSocialMedia(platform);
    }
  };

  const renderSocialButton = (platform, iconName, color, iconType = 'Feather') => {
    const url = platform === 'whatsapp'
      ? userContacts.whatsapp
      : userContacts.socialMedia[platform];
    const hasValue = url !== null && url !== '';
    const IconComponent =
      iconType === 'MaterialCommunity' ? MaterialCommunityIcons :
      iconType === 'FontAwesome5' ? FontAwesome5 :
      Feather;
    return (
      <TouchableOpacity
        key={platform}
        style={[
          styles.socialButton,
          { backgroundColor: hasValue ? color + '15' : (isDark ? '#2A2A2A' : '#F5F5F5') },
        ]}
        onPress={() => handleSocialButtonPress(platform)}
        onLongPress={() => openSocialEdit(platform)}
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

  const isValidUrl = (url) => {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const saveOtherProfiles = async (profiles) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const existing = snap.exists() ? snap.data() : {};
      await setDoc(userRef, {
        ...existing,
        contacts: {
          ...existing.contacts,
          otherProfiles: profiles,
        },
      });
    } catch (error) {
      console.log('Error guardando otros perfiles:', error);
    }
  };

  const openAddProfile = () => {
    setEditingProfileIndex(null);
    setProfileNameInput('');
    setProfileUrlInput('');
    setAddingProfile(true);
    setProfileModalVisible(true);
  };

  const openEditProfile = (index) => {
    setEditingProfileIndex(index);
    setProfileNameInput(otherProfiles[index].name);
    setProfileUrlInput(otherProfiles[index].url);
    setAddingProfile(false);
    setProfileModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const name = profileNameInput.trim();
    const url = profileUrlInput.trim();
    if (!name) return Alert.alert('Error', 'El nombre es obligatorio.');
    if (!url) return Alert.alert('Error', 'La URL es obligatoria.');
    if (!isValidUrl(url)) return Alert.alert('Error', 'La URL no es válida. Debe comenzar con http:// o https://');

    let newProfiles;
    if (editingProfileIndex !== null) {
      newProfiles = otherProfiles.map((p, i) =>
        i === editingProfileIndex ? { name, url } : p
      );
    } else {
      newProfiles = [...otherProfiles, { name, url }];
    }

    setOtherProfiles(newProfiles);
    await saveOtherProfiles(newProfiles);
    setProfileModalVisible(false);
  };

  const handleDeleteProfile = async (index) => {
    Alert.alert('Eliminar perfil', `¿Eliminar "${otherProfiles[index].name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const newProfiles = otherProfiles.filter((_, i) => i !== index);
          setOtherProfiles(newProfiles);
          await saveOtherProfiles(newProfiles);
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${userName || userUsername} te ha invitado a 3D_Share 📲\n¡Buscá a @${userUsername} cuando entres a la app!`,
      });
    } catch (error) {
      console.log('Error al compartir:', error);
    }
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
            Toca para abrir el enlace. Mantené presionado para editarlo
          </Text>

          <View style={styles.socialGrid}>
            {renderSocialButton('whatsapp', 'whatsapp', '#25D366', 'MaterialCommunity')}
            {renderSocialButton('facebook', 'facebook', '#1877F2')}
            {renderSocialButton('instagram', 'instagram', '#E1306C')}
            {renderSocialButton('telegram', 'telegram', '#0088CC', 'FontAwesome5')}
          </View>
        </View>

        {/* Tus otros perfiles */}
        <View style={styles.contactsSection}>
          <Text style={[styles.contactsSectionTitle, { color: colors.text }]}>
            Tus otros perfiles
          </Text>
          <Text style={[styles.contactsSectionSubtitle, { color: isDark ? '#888' : '#777' }]}>
            Agregá enlaces a tus otros perfiles
          </Text>

          {otherProfiles.map((profile, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.profileCard, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC' }]}
              onPress={() => openEditProfile(index)}
              onLongPress={() => handleDeleteProfile(index)}
            >
              <View style={styles.profileCardContent}>
                <Text style={[styles.profileName, { color: colors.text }]}>{profile.name}</Text>
                <Text style={[styles.profileUrl, { color: isDark ? '#888' : '#666' }]} numberOfLines={1}>{profile.url}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDark ? '#555' : '#999'} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.addProfileButton, { borderColor: isDark ? '#333' : '#DCDCDC' }]}
            onPress={openAddProfile}
          >
            <Ionicons name="add-circle-outline" size={22} color="#546F1C" />
            <Text style={[styles.addProfileText, { color: '#546F1C' }]}>Agregar perfil</Text>
          </TouchableOpacity>
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
            paddingTop: insets.top + 0,
            backgroundColor: colors.card,
            borderBottomColor: isDark ? '#222' : '#E8E8E8',
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('AccountSwitcher')}
          style={[styles.headerCenter, { marginLeft: 8 }, { marginTop: 10 }]}
        >
          <Text
            style={[styles.headerUsername, { color: colors.text }]}
            numberOfLines={1}
          >
            {userName}
          </Text>
          <View style={[styles.headerDivider, { backgroundColor: isDark ? '#444' : '#DDD' }]} />
          <Text
            style={[styles.headerHandle, { color: isDark ? '#888' : '#666' }]}
            numberOfLines={1}
          >
            @{userUsername}
          </Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={[{ data: [1], key: 'content' }]}
        stickySectionHeadersEnabled
        removeClippedSubviews={false}
        keyExtractor={(_, i) => String(i)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#546F1C']}
            tintColor="#546F1C"
          />
        }
        ListHeaderComponent={() => (
          <View style={styles.profileSection}>
            {/* Fila: avatar + stats */}
            <View style={styles.avatarStatsRow}>
              <TouchableOpacity style={[styles.avatarWrapper, { borderColor: isDark ? '#222' : '#E0E0E0' }]} onPress={() => profilePicture && setImagePreviewVisible(true)}>
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
              </TouchableOpacity>

              <View style={styles.statsRow}>
                <View style={styles.statsNumbers}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: colors.text }]}>{posts.length}</Text>
                    <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>
                      Publicaciones
                    </Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={() => navigation.navigate('Contacts', { initialTab: 0 })}
                  >
                    <Text style={[styles.statNumber, { color: colors.text }]}>{followersCount}</Text>
                    <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>
                      Seguidores
                    </Text>
                  </TouchableOpacity>
                  <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={() => navigation.navigate('Contacts', { initialTab: 1 })}
                  >
                    <Text style={[styles.statNumber, { color: colors.text }]}>{followingCount}</Text>
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

              <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.8} onPress={handleShare}>
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
        )}
        renderSectionHeader={() => (
          <View
            style={{
              backgroundColor: colors.background,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? '#2A2A2A' : '#E0E0E0',
              paddingTop: 5,
            }}
          >
            <View style={styles.tabsContainer}>
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
          </View>
        )}
        renderItem={() => (
          <View style={styles.tabContent}>{renderTabContent()}</View>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal para agregar/editar perfil */}
      <Modal visible={profileModalVisible} transparent animationType="fade" onRequestClose={() => setProfileModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalKeyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setProfileModalVisible(false)}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#2A2A2A' : '#FFF' }]}>
              <TouchableOpacity activeOpacity={1}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {addingProfile ? 'Agregar perfil' : 'Editar perfil'}
                </Text>

                <TextInput
                  style={[styles.modalInput, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC', color: colors.text }]}
                  placeholder="Nombre del perfil"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  value={profileNameInput}
                  onChangeText={setProfileNameInput}
                />

                <TextInput
                  style={[styles.modalInput, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC', color: colors.text }]}
                  placeholder="URL (https://...)"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  value={profileUrlInput}
                  onChangeText={setProfileUrlInput}
                  autoCapitalize="none"
                  keyboardType="url"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}
                    onPress={() => setProfileModalVisible(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#546F1C' }]}
                    onPress={handleSaveProfile}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para agregar/editar red social */}
      <Modal visible={socialModalVisible} transparent animationType="fade" onRequestClose={() => setSocialModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalKeyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSocialModalVisible(false)}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#2A2A2A' : '#FFF' }]}>
              <TouchableOpacity activeOpacity={1}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingSocialPlatform
                    ? `${editingSocialPlatform.charAt(0).toUpperCase() + editingSocialPlatform.slice(1)}`
                    : ''}
                </Text>

                <TextInput
                  style={[styles.modalInput, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC', color: colors.text }]}
                  placeholder={editingSocialPlatform === 'whatsapp' ? 'Número de teléfono (ej: 3624918273)' : 'URL o usuario (ej: https://...)'}
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  value={socialInputValue}
                  onChangeText={setSocialInputValue}
                  autoCapitalize="none"
                  keyboardType={editingSocialPlatform === 'whatsapp' ? 'phone-pad' : 'url'}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}
                    onPress={() => setSocialModalVisible(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#546F1C' }]}
                    onPress={handleSaveSocial}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Guardar</Text>
                  </TouchableOpacity>
                </View>

                {!!getSocialValue(editingSocialPlatform) && (
                  <TouchableOpacity style={styles.modalDeleteButton} onPress={handleDeleteSocial}>
                    <Text style={styles.modalDeleteButtonText}>Eliminar enlace</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
      <MediaViewerModal
        visible={imagePreviewVisible}
        items={profilePicture ? [{ id: 'profile', mediaUrl: profilePicture, type: 'image' }] : []}
        initialIndex={0}
        onClose={() => setImagePreviewVisible(false)}
        hideCounter
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
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: 8,
  },
  headerUsername: {
    fontSize: 22,
    fontFamily: 'Nunito-BoldItalic',
  },
  headerDivider: {
    width: 1.2,
    height: 32,
    marginHorizontal: 8,
  },
  headerHandle: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    marginTop: 6,
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
    marginLeft: 0.5,
    marginTop: 2,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 6,
    margin: 1,
    overflow: 'hidden',
    backgroundColor: '#333',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  // 🆕 Badge de video
  videoBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Tus otros perfiles
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  profileCardContent: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
    marginBottom: 2,
  },
  profileUrl: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
  },
  addProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 5,
  },
  addProfileText: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
  },
  // Modal de perfiles
  modalKeyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 28,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    textAlign: 'center',
    marginBottom: 22,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 52,
    fontFamily: 'Nunito-Regular',
    fontSize: 15,
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
  },
  modalDeleteButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalDeleteButtonText: {
    color: '#E53935',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
});