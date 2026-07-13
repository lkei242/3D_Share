
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
  Linking,
  Alert,
  Share,
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { auth, db } from './config/firebase';
import CachedImage from './config/CachedImage';
import { formatViews } from './config/formatViews';
import { doc, getDoc, collection, query, where, orderBy, getDocs, setDoc, deleteDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { checkIfFollowing, followUser, unfollowUser, getFollowersCount, checkIfBlocked, blockUser, unblockUser, 
muteUser, unmuteUser, checkIfMuted, reportUser, getUserMessagePreference, checkMutualFollow, sendMessageRequest, getMessageRequest } from './config/userActions';
import { emitBlockUser } from './config/BlockBus';
import { emitMuteUser } from './config/MuteBus';
import PostMenuModal from './components/PostMenuModal';

const { width: screenWidth } = Dimensions.get('window');
const GRID_ITEM_SIZE = (screenWidth - 20) / 3;
const TABS = ['Publicaciones', 'Contactos'];

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
  const [isMuted, setIsMuted] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToastIcon, setShowToastIcon] = useState(true);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef(null);
  const [pinnedPosts, setPinnedPosts] = useState([]);
  const [userNotFound, setUserNotFound] = useState(false);
  const [otherProfiles, setOtherProfiles] = useState([]);
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

  const currentUser = auth.currentUser;
  const moreButtonRef = useRef(null);

  const showToast = (message, showIcon = true) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    setShowToastIcon(showIcon);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToastMessage(''));
    }, 3000);
  };

  const handlePostPress = (post) => {
    navigation.navigate('PostDetail', { post, posts });
  };

  const fetchUserProfile = useCallback(async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUserNotFound(false);
        const data = userDoc.data();
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
        setUserNotFound(true);
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
      const postsFormateados = snapshot.docs.map(d => {
        const data = d.data();
        const mediaArray = data.media || (data.imagenes || []).map(url => ({ url, type: 'image' }));
        return {
          id: d.id,
          title: data.titulo || 'Sin título',
          image: mediaArray.length > 0 ? mediaArray[0].url : 'https://picsum.photos/seed/placeholder/400/300',
          price: data.precio ? `${data.precio}$` : null,
          views: formatViews(data.vistas || 0),
          totalImages: mediaArray.length,
          media: mediaArray,
          hasVideo: mediaArray.some(m => m.type === 'video'),
          description: data.descripcion || '',
          author: data.autor,
          authorProfileName: userData.profileName || userData.username || 'Usuario',
          authorUsername: userData.username || 'usuario',
          authorProfilePicture: userData.profilePicture || '',
        };
      });
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

  const fetchMuted = useCallback(async () => {
    if (!currentUser) return;
    const muted = await checkIfMuted(currentUser.uid, userId);
    setIsMuted(muted);
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

  
  const handleWhatsApp = () => {
    if (userContacts.whatsapp) {
      const phone = userContacts.whatsapp.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Mirá el perfil de ${profileName || username} en 3D Share: @${username}`,
      });
    } catch (error) {
      console.log('Error al compartir:', error);
    }
  };

  const handleMessagePress = async () => {
    if (!currentUser || currentUser.uid === userId) return;
    if (!isFollowing) {
      showToast('Para mandar un mensaje a cualquier usuario primero debes seguirlo', false);
      return;
    }
    
    const targetPref = await getUserMessagePreference(userId);
    if (!targetPref) {
      const isMutual = await checkMutualFollow(currentUser.uid, userId);
      if (!isMutual) {
        const existingRequest = await getMessageRequest(currentUser.uid, userId);
        if (existingRequest && existingRequest.status === 'pending') {
          showToast('Ya enviaste una solicitud a este usuario. Esperá a que la apruebe.');
          return;
        }
        if (existingRequest && existingRequest.status === 'approved') {
          
        } else {
          setRequestModalVisible(true);
          return;(
            'Mensajes restringidos',
            'Este usuario tiene habilitada la función de mensajes por follow mutuo, por lo cual no puedes chatear con él a menos que él te siga o que apruebe tu solicitud de mensaje',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Enviar solicitud de mensaje',
                style: 'default',
                onPress: async () => {
                  const ok = await sendMessageRequest(currentUser.uid, userId);
                  if (ok) showToast('Solicitud de mensaje enviada');
                },
              },
            ]
          );
          return;
        }
      }
    }
    try {
      
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUser.uid)
      );
      const snap = await getDocs(q);
      const existingChatDoc = snap.docs.find(d => {
        const data = d.data();
        return (
          (data.participants || []).length === 2 &&
          data.participants.includes(userId) &&
          !(data.deletedBy || []).includes(currentUser.uid)
        );
      });

      if (existingChatDoc) {
        navigation.navigate('ChatDetail', {
          chatId: existingChatDoc.id,
          name: profileName || username,
          username: username,
          profilePicture: profilePicture || '',
          otherUid: userId,
        });
      } else {
        const deletedChatDoc = snap.docs.find(d => {
          const data = d.data();
          const deletedBy = data.deletedBy || [];
          return data.participants?.includes(userId) && deletedBy.includes(currentUser.uid);
        });

        if (deletedChatDoc) {
          const deletedBy = deletedChatDoc.data().deletedBy || [];
          const otherDeleted = deletedBy.includes(userId);
          if (otherDeleted) {
            navigation.navigate('ChatDetail', {
              chatId: null,
              name: profileName || username,
              username: username,
              profilePicture: profilePicture || '',
              otherUid: userId,
              isNewChat: true,
            });
          } else {
            await updateDoc(deletedChatDoc.ref, { deletedBy: arrayRemove(currentUser.uid) });
            navigation.navigate('ChatDetail', {
              chatId: deletedChatDoc.id,
              name: profileName || username,
              username: username,
              profilePicture: profilePicture || '',
              otherUid: userId,
            });
          }
        } else {
          navigation.navigate('ChatDetail', {
            chatId: null,
            name: profileName || username,
            username: username,
            profilePicture: profilePicture || '',
            otherUid: userId,
            isNewChat: true,
          });
        }
      }
    } catch (err) {
      console.log('Error al abrir chat:', err);
      showToast('No se pudo abrir el chat');
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
    fetchMuted();
  }, [fetchUserProfile, fetchUserPosts, checkFollowing, fetchFollowersCount, fetchFollowingCount, fetchBlocked, fetchMuted]);

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
              <CachedImage uri={post.image} style={styles.gridImage} />
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

    const IconComponent =
      iconType === 'MaterialCommunity' ? MaterialCommunityIcons :
      iconType === 'FontAwesome5' ? FontAwesome5 :
      Feather;

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
            {}
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

            {}
            {Object.values(userContacts.socialMedia).some(v => v !== null) && (
              <View style={styles.contactsSection}>
                <Text style={[styles.contactsSectionTitle, { color: colors.text }]}>
                  Redes sociales
                </Text>
                
                <View style={styles.socialGrid}>
                  {renderSocialButton('telegram', 'telegram', '#0088CC', 'FontAwesome5')}
                  {renderSocialButton('facebook', 'facebook', '#1877F2')}
                  {renderSocialButton('instagram', 'instagram', '#E1306C')}
                </View>
              </View>
            )}

            {}
            {otherProfiles.length > 0 && (
              <View style={styles.contactsSection}>
                <Text style={[styles.contactsSectionTitle, { color: colors.text }]}>
                  Otros perfiles
                </Text>

                {otherProfiles.map((profile, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.profileCard, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC' }]}
                    onPress={() => Linking.openURL(profile.url)}
                  >
                    <View style={styles.profileCardContent}>
                      <Text style={[styles.profileName, { color: colors.text }]}>{profile.name}</Text>
                      <Text style={[styles.profileUrl, { color: isDark ? '#888' : '#666' }]} numberOfLines={1}>{profile.url}</Text>
                    </View>
                    <Ionicons name="open-outline" size={20} color={isDark ? '#555' : '#999'} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      
      default:
        return null;
    }
  };

  if (userNotFound) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: colors.card, borderBottomColor: isDark ? '#222' : '#E8E8E8', borderBottomWidth: 1, position: 'absolute', top: 0, left: 0, right: 0 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerUsername, { color: colors.text }]} numberOfLines={1}>
            {profileName}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <Ionicons name="person-remove-outline" size={64} color={isDark ? '#555' : '#ccc'} />
        <Text style={{ color: isDark ? '#888' : '#999', fontSize: 16, marginTop: 16, textAlign: 'center', paddingHorizontal: 40 }}>
          Esta cuenta de usuario no existe o ha sido eliminada
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {}
      <View style={[
        styles.header,
        {
          paddingTop: insets.top + 6,
          backgroundColor: colors.card,
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
          <TouchableOpacity
            style={styles.headerBtn}
            ref={moreButtonRef}
            onPress={() => {
              moreButtonRef.current?.measureInWindow((x, y, width, height) => {
                setMenuAnchor({ x, y, width, height });
                setMenuVisible(true);
              });
            }}
          >
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
            {}
            <View style={styles.avatarStatsRow}>
              <View style={[styles.avatarWrapper, { borderColor: isDark ? '#222' : '#E0E0E0' }]}>
                {profilePicture ? (
                  <CachedImage uri={profilePicture} style={styles.avatarImage} />
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

            {}
            {presentation && presentation.trim().length > 0 ? (
              <>
                <Text style={[styles.bioText, { color: isDark ? '#BBB' : '#555' }]}>
                  {presentation}
                </Text>
              </>
            ) : null}

            {}
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

                <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.8} onPress={handleMessagePress}>
                  <Feather name="message-circle" size={16} color={isDark ? '#FFF' : '#333'} style={{ marginRight: 6 }} />
                  <Text style={[styles.btnSecondaryText, { color: isDark ? '#FFF' : '#333' }]}>
                    Mensaje
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btnIcon, { backgroundColor: isDark ? '#2A2A2A' : '#EFEFEF' }]} activeOpacity={0.8} onPress={handleShare}>
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
      <PostMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isOwnPost={false}
        isMuted={isMuted}
        isBlocked={isBlocked}
        reportLabel="Denunciar usuario"
        anchorPosition={menuAnchor}
        onOptionPress={(key) => {
          if (key === 'mute') {
            Alert.alert(
              'Silenciar usuario',
              `¿Querés silenciar a ${profileName}? No verás sus publicaciones en tu feed.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Silenciar',
                  onPress: async () => {
                    const ok = await muteUser(currentUser.uid, userId);
                    if (ok) {
                      emitMuteUser(userId);
                      setIsMuted(true);
                      setMenuVisible(false);
                    }
                  },
                },
              ]
            );
          }
          if (key === 'unmute') {
            unmuteUser(currentUser.uid, userId).then(() => {
              setIsMuted(false);
              setMenuVisible(false);
            });
          }
          if (key === 'report') {
            setMenuVisible(false);
            setReportModalVisible(true);
          }
          if (key === 'block') {
            setMenuVisible(false);
            setBlockModalVisible(true);
          }
          if (key === 'unblock') {
            setMenuVisible(false);
            unblockUser(currentUser.uid, userId).then(() => {
              setIsBlocked(false);
            });
          }
        }}
      />
      <Modal visible={reportModalVisible} transparent animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setReportModalVisible(false)}>
          <View style={styles.reportOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.reportModal, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                
                {}
                <TouchableOpacity 
                  style={styles.reportCloseBtn} 
                  onPress={() => setReportModalVisible(false)} 
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Ionicons name="close-circle" size={26} color={isDark ? '#48484A' : '#C7C7CC'} />
                </TouchableOpacity>

                {}
                <View style={styles.reportHeader}>
                  <View style={[styles.reportIconBadge, { backgroundColor: isDark ? '#3A2020' : '#FFEBEE' }]}>
                    <Feather name="flag" size={22} color="#E53935" />
                  </View>
                  <Text style={[styles.reportTitle, { color: colors.text }]}>Reportar usuario</Text>
                  <Text style={[styles.reportSubtitle, { color: isDark ? '#8E8E93' : '#666' }]}>
                    Ayúdanos a entender el problema con @{username}
                  </Text>
                </View>

                {}
                <View style={[styles.reportOptionsWrapper, { backgroundColor: isDark ? '#2C2C2E' : '#F8F8F8' }]}>
                  {[
                    'Acoso o intimidación',
                    'Spam',
                    'Suplantación de identidad',
                    'Discurso de odio',
                    'Contenido sexual o desnudos',
                    'Estafas o fraude',
                    'Violación de la privacidad',
                  ].map((reason, index, arr) => (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reportOption,
                        { borderBottomColor: isDark ? '#3A3A3C' : '#E5E5EA' },
                        index === arr.length - 1 && { borderBottomWidth: 0 }
                      ]}
                      onPress={() => {
                        setReportModalVisible(false);
                        reportUser(currentUser.uid, userId, reason);
                        showToast(`Usuario '${profileName}' denunciado`);
                      }}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.reportOptionText, { color: colors.text }]}>{reason}</Text>
                      <Ionicons name="chevron-forward" size={18} color={isDark ? '#48484A' : '#C7C7CC'} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal visible={blockModalVisible} transparent animationType="slide" onRequestClose={() => setBlockModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setBlockModalVisible(false)}>
          <View style={styles.reportOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.reportModal, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                <TouchableOpacity 
                  style={styles.reportCloseBtn} 
                  onPress={() => setBlockModalVisible(false)} 
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Ionicons name="close-circle" size={26} color={isDark ? '#48484A' : '#C7C7CC'} />
                </TouchableOpacity>

                <View style={styles.reportHeader}>
                  <View style={[styles.reportIconBadge, { backgroundColor: isDark ? '#3A2020' : '#FFEBEE' }]}>
                    <Ionicons name="ban-outline" size={24} color="#E53935" />
                  </View>
                  <Text style={[styles.reportTitle, { color: colors.text }]}>Bloquear usuario</Text>
                  <Text style={[styles.reportSubtitle, { color: isDark ? '#8E8E93' : '#666' }]}>
                    Si bloqueás a @{username}, no verás sus publicaciones y no podrán interactuar con vos.
                  </Text>
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: '#E53935', borderRadius: 12, paddingVertical: 16, marginHorizontal: 12, marginTop: 8 }}
                  onPress={() => {
                    
                    
                    
                    const wasFollowing = isFollowing;
                    setIsBlocked(true);
                    setBlockModalVisible(false);
                    if (wasFollowing) {
                      setIsFollowing(false);
                      setFollowersCount(prev => Math.max(0, prev - 1));
                    }
                    emitBlockUser(userId);
                    (async () => {
                      const [isFollowing2] = await Promise.all([
                        checkIfFollowing(currentUser.uid, userId),
                        blockUser(currentUser.uid, userId),
                      ]);
                      if (isFollowing2) {
                        await unfollowUser(currentUser.uid, userId);
                      }
                    })();
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={{ color: '#FFFFFF', fontFamily: 'Nunito-Bold', fontSize: 15, textAlign: 'center' }}>Bloquear</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
            {}
      <Modal visible={requestModalVisible} transparent animationType="slide" onRequestClose={() => setRequestModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setRequestModalVisible(false)}>
          <View style={styles.reportOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.reportModal, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                <TouchableOpacity 
                  style={styles.reportCloseBtn} 
                  onPress={() => setRequestModalVisible(false)} 
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Ionicons name="close-circle" size={26} color={isDark ? '#48484A' : '#C7C7CC'} />
                </TouchableOpacity>

                <View style={styles.reportHeader}>
                  <View style={[styles.reportIconBadge, { backgroundColor: isDark ? '#1A2E1A' : '#E8F5E9' }]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color="#4CAF50" />
                  </View>
                  <Text style={[styles.reportTitle, { color: colors.text }]}>Mensajes restringidos</Text>
                  <Text style={[styles.reportSubtitle, { color: isDark ? '#8E8E93' : '#666' }]}>
                    Este usuario tiene habilitada la función de mensajes por follow mutuo, por lo cual no puedes chatear con él a menos que él te siga o que apruebe tu solicitud de mensaje
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, marginHorizontal: 12 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: isDark ? '#2C2C2C' : '#F2F2F2', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                    onPress={() => setRequestModalVisible(false)}
                    activeOpacity={0.6}
                  >
                    <Text style={{ color: colors.text, fontFamily: 'Nunito-Bold', fontSize: 15 }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                    onPress={async () => {
                      const ok = await sendMessageRequest(currentUser.uid, userId);
                      setRequestModalVisible(false);
                      if (ok) showToast('Solicitud de mensaje enviada');
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={{ color: '#FFFFFF', fontFamily: 'Nunito-Bold', fontSize: 15 }}>Enviar solicitud</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {toastMessage !== '' && (
        <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }] }]}>
          {showToastIcon && <Ionicons name="checkmark-circle" size={20} color="#FFF" />}
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
container:{flex:1},
header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:8,paddingBottom:10,borderBottomWidth:1},
headerBtn:{padding:6},
headerUsername:{flex:1,marginLeft:18,fontSize:22,fontFamily:'Nunito-BoldItalic'},
headerActions:{flexDirection:'row',alignItems:'center'},
profileSection:{paddingHorizontal:16,paddingTop:20,paddingBottom:4},
avatarStatsRow:{flexDirection:'row',alignItems:'center',marginBottom:14},
avatarWrapper:{width:90,height:90,borderRadius:45,borderWidth:3,overflow:'hidden',marginRight:1},
avatarFallback:{width:'100%',height:'100%',alignItems:'center',justifyContent:'center'},
avatarImage:{width:'100%',height:'100%'},
statsRow:{flex:1,alignItems:'flex-start',justifyContent:'center'},
statsNumbers:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',width:'100%',marginTop:4},
statDivider:{width:1,height:32},
statItem:{alignItems:'center',flex:1},
statNumber:{fontSize:20,fontFamily:'Nunito-Bold'},
statLabel:{fontSize:11,fontFamily:'Nunito-Regular',marginTop:3,textAlign:'center'},
userHandle:{fontSize:16,fontFamily:'Nunito-Bold',marginBottom:2,marginLeft:10},
profileName:{fontSize:17,fontFamily:'Nunito-Bold',marginBottom:6},
bioText:{fontSize:14,fontFamily:'Nunito-Regular',lineHeight:20,marginBottom:16},
buttonsRow:{flexDirection:'row',gap:8,marginBottom:8,marginTop:4},
btnPrimary:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:'#9DBD3F',borderRadius:10,paddingVertical:10},
btnFollowing:{backgroundColor:'#444'},
btnBlocked:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',borderRadius:10,paddingVertical:10},
btnBlockedText:{fontFamily:'Nunito-Bold',fontSize:14},
btnPrimaryText:{color:'#FFF',fontFamily:'Nunito-Bold',fontSize:14},
btnSecondary:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:'transparent',borderRadius:10,paddingVertical:10,borderWidth:1.5,borderColor:'#9DBD3F'},
btnSecondaryText:{fontFamily:'Nunito-Bold',fontSize:14},
btnIcon:{width:42,height:42,borderRadius:10,alignItems:'center',justifyContent:'center'},
tabsContainer:{flexDirection:'row'},
tab:{flex:1,paddingVertical:12,alignItems:'center',borderBottomWidth:2.5,borderBottomColor:'transparent'},
tabText:{fontSize:13,fontFamily:'Nunito-Bold'},
tabContent:{paddingHorizontal:5,paddingTop:6},
gridContainer:{flexDirection:'row',flexWrap:'wrap',gap:4,marginTop:4},
gridItem:{width:GRID_ITEM_SIZE,height:GRID_ITEM_SIZE,borderRadius:6,overflow:'hidden',backgroundColor:'#333'},
gridImage:{width:'100%',height:'100%'},
pinBadge:{position:'absolute',top:4,right:4,backgroundColor:'#546F1C',borderRadius:10,width:20,height:20,alignItems:'center',justifyContent:'center'},
gridPriceTag:{position:'absolute',bottom:4,left:4,backgroundColor:'rgba(0,0,0,0.65)',borderRadius:4,paddingHorizontal:5,paddingVertical:2},
gridPriceText:{color:'#fff',fontSize:10,fontFamily:'Nunito-Bold'},
contactsContainer:{paddingHorizontal:12,paddingTop:16},
contactsSection:{marginBottom:24},
contactsSectionTitle:{fontSize:16,fontFamily:'Nunito-Bold',marginBottom:12,marginLeft:4},
contactCard:{flexDirection:'row',alignItems:'center',padding:14,borderRadius:12,marginBottom:10},
contactIconWrapper:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',marginRight:12},
contactInfo:{flex:1},
contactLabel:{fontSize:12,fontFamily:'Nunito-Regular',marginBottom:2},
contactValue:{fontSize:15,fontFamily:'Nunito-Bold'},
socialGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
socialButton:{width:(screenWidth-60)/3,aspectRatio:1,borderRadius:16,alignItems:'center',justifyContent:'center',marginBottom:10},
socialButtonText:{fontSize:12,fontFamily:'Nunito-Bold',marginTop:8},
emptyContactsContainer:{alignItems:'center',justifyContent:'center',paddingVertical:60,paddingHorizontal:40},
emptyContactsTitle:{fontSize:18,fontFamily:'Nunito-Bold',marginTop:16,marginBottom:8,textAlign:'center'},
emptyContactsSubtitle:{fontSize:14,fontFamily:'Nunito-Regular',textAlign:'center',lineHeight:20},
emptyText:{textAlign:'center',marginTop:60,fontSize:15,fontFamily:'Nunito-Regular'},
profileCard:{flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:12,paddingHorizontal:16,paddingVertical:14,marginBottom:10},
profileCardContent:{flex:1},
profileName:{fontSize:15,fontFamily:'Nunito-Bold',marginBottom:2},
profileUrl:{fontSize:13,fontFamily:'Nunito-Regular'},
reportOverlay:{flex:1,justifyContent:'center',alignItems:'center',padding:20},
reportModal:{width:'100%',maxWidth:400,borderRadius:20,padding:24,paddingTop:16,shadowColor:'#000',shadowOffset:{width:0,height:10},shadowOpacity:0.25,shadowRadius:20,elevation:15},
reportCloseBtn:{position:'absolute',top:16,right:16,zIndex:10},
reportHeader:{alignItems:'center',marginBottom:24,marginTop:12},
reportIconBadge:{width:60,height:60,borderRadius:30,alignItems:'center',justifyContent:'center',marginBottom:16},
reportTitle:{fontSize:20,fontFamily:'Nunito-Bold',marginBottom:8,textAlign:'center'},
reportSubtitle:{fontSize:14,fontFamily:'Nunito-Regular',textAlign:'center',lineHeight:20,paddingHorizontal:10},
reportOptionsWrapper:{borderRadius:12,overflow:'hidden'},
reportOption:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:16,paddingHorizontal:16,borderBottomWidth:1},
reportOptionText:{fontSize:15,fontFamily:'Nunito-SemiBold',flex:1},
toast:{position:'absolute',top:60,left:20,right:20,flexDirection:'row',alignItems:'center',backgroundColor:'#323232',paddingVertical:12,paddingHorizontal:16,borderRadius:10,gap:10,elevation:6,shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:6},
toastText:{color:'#FFF',fontSize:14,fontFamily:'Nunito-Bold',flex:1},
});