// src/screens/PostDetailScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Keyboard,
  ScrollView,
  Modal,
  Alert,
  Linking,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { deleteMediaFromCloudinary } from '../config/mediaHelper';
import CommentModal from './CommentModal';
import PostMenuModal from './PostMenuModal';
import PostInfoModal from './PostInfoModal';
import MediaViewerModal from '../chats_screens/Mediaviewer';
import { useVideoPlayer, VideoView } from 'expo-video'; // ← NUEVO
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  startAfter,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { formatViews } from '../config/formatViews';
import { emitViewIncrement } from '../config/ViewsBus';
import { emitBlockUser } from '../config/BlockBus';
import { emitMuteUser } from '../config/MuteBus';
import { muteUser, unmuteUser, checkIfMuted, checkIfBlocked, blockUser, unblockUser, unfollowUser, checkIfFollowing, reportPost } from '../config/userActions';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const coverAspectCache = new Map();
const savedStatusCache = new Map();

// COMPONENTE: VideoThumbnail (miniatura estática, no interactiva)
// El toque para reproducir/ver en grande lo maneja el TouchableOpacity
// exterior del carrusel, igual que con las imágenes: así abrir un video
// se siente idéntico a abrir una imagen (mismo modal, mismo gesto).
const VideoThumbnail = React.memo(function VideoThumbnail({ uri, style }) {
  const player = useVideoPlayer(uri, (playerInstance) => {
    playerInstance.loop = false;
    playerInstance.muted = true;
    // No reproducir aca: esto es solo una miniatura (primer frame).
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#000', position: 'relative' }}>
      <VideoView
        player={player}
        style={style || styles.postImage}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        nativeControls={false}
        contentFit="cover"
        pointerEvents="none"
      />

      {/* Ícono de play puramente visual (no capta toques) */}
      <View style={styles.playButtonOverlay} pointerEvents="none">
        <MaterialCommunityIcons
          name="play-circle"
          size={70}
          color="rgba(255,255,255,0.9)"
        />
      </View>
    </View>
  );
});

// COMPONENTE: PostItem (un post individual, autónomo)
const PostItem = React.memo(function PostItem({ post, isOwnPost, displayName, displayHandle, authorProfilePicture, colors, isDark, pageHeight, onOpenComments, onAuthorPress, onMorePress, onOpenMediaViewer }) {
  const currentUser = auth.currentUser;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [currentMediaIdx, setCurrentMediaIdx] = useState(0);
  const moreButtonRef = React.useRef(null);

  useEffect(() => {
    if (!currentUser || !post) return;
    if (savedStatusCache.has(post.id)) {
      setSaved(savedStatusCache.get(post.id));
      return;
    }
    let cancelled = false;
    const savedRef = doc(db, 'saved', `${currentUser.uid}_${post.id}`);
    getDoc(savedRef).then((snap) => {
      const exists = snap.exists();
      savedStatusCache.set(post.id, exists);
      if (!cancelled) setSaved(exists);
    });
    return () => { cancelled = true; };
  }, [post.id, currentUser?.uid]);
  const mediaList = post.media && post.media.length > 0 ? post.media : [{ url: post.image, type: 'image' }];
  const postViews = post.views || 0;

  // 🆕 Relación de aspecto de la imagen de portada: usa cache si ya se conoce
  const DEFAULT_ASPECT_RATIO = 4 / 5;
  const [coverAspectRatio, setCoverAspectRatio] = useState(
    () => coverAspectCache.get(mediaList[0]?.url) || DEFAULT_ASPECT_RATIO
  );

  const MIN_MEDIA_HEIGHT = pageHeight * 0.35;
  const MAX_MEDIA_HEIGHT = pageHeight * 0.75;
  const mediaHeight = Math.min(
    Math.max(screenWidth / coverAspectRatio, MIN_MEDIA_HEIGHT),
    MAX_MEDIA_HEIGHT
  );

  const DESCRIPTION_LIMIT = 100;
  const fullDescription = post.description || 'Sin descripción adicional.';
  const isLongDescription = fullDescription.length > DESCRIPTION_LIMIT;
  const truncatedDescription = isLongDescription
    ? fullDescription.slice(0, DESCRIPTION_LIMIT).trimEnd()
    : fullDescription;

  const handleOpenLink = () => {
    if (post.webLink) {
      Linking.openURL(post.webLink).catch(() => {
        Alert.alert('No se pudo abrir el enlace', 'El enlace parece no ser válido.');
      });
    }
  };

  const handleLike = async () => {
    if (!currentUser || !post) return;
    const likeRef = doc(db, 'likes', `${currentUser.uid}_${post.id}`);
    if (liked) {
      await deleteDoc(likeRef);
      setLiked(false);
    } else {
      await setDoc(likeRef, {
        userId: currentUser.uid,
        postId: post.id,
        postImage: post.image,
        postTitle: post.title,
        postAuthor: post.author,
        createdAt: new Date(),
      });
      setLiked(true);
    }
  };

  const handleSave = async () => {
    if (!currentUser || !post) return;
    const savedRef = doc(db, 'saved', `${currentUser.uid}_${post.id}`);
    if (saved) {
      await deleteDoc(savedRef);
      setSaved(false);
      savedStatusCache.set(post.id, false); // 🆕
    } else {
      await setDoc(savedRef, {
        userId: currentUser.uid,
        postId: post.id,
        postImage: post.image,
        postTitle: post.title,
        postAuthor: post.author,
        createdAt: new Date(),
      });
      setSaved(true);
      savedStatusCache.set(post.id, true); // 🆕
    }
  };

  return (
    <View style={{ backgroundColor: colors.background, position: 'relative' }}>
      {/* USER INFO */}
      <TouchableOpacity style={styles.userInfoRow} onPress={onAuthorPress} activeOpacity={0.7}>
        <View style={[styles.avatarContainer, { borderColor: colors.avatarborder }]}>
          {authorProfilePicture ? (
            <Image source={{ uri: authorProfilePicture }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
              <Ionicons name="person-circle-outline" size={26} color="#94BA46" />
            </View>
          )}
        </View>
        <View style={styles.userNameContainer}>
          <Text style={[styles.userNameText, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.userHandleText, { color: isDark ? '#aaa' : '#666' }]}>{displayHandle}</Text>
        </View>
        <TouchableOpacity
          ref={moreButtonRef}
          style={styles.moreButton}
          onPress={() => {
            moreButtonRef.current?.measureInWindow((x, y, width, height) => {
              onMorePress({ x, y, width, height });
            });
          }}
        >
          <Feather name="more-vertical" size={20} color={colors.text} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* CONTENIDO SCROLLEABLE INTERNO */}
      <View>
        {/* POST MEDIA CAROUSEL */}
        <View style={[styles.imageWrapper, { height: mediaHeight }]}>
          <FlatList
            data={mediaList}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setCurrentMediaIdx(idx);
            }}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onOpenMediaViewer?.(post, index)}
                style={{ width: screenWidth, height: '100%' }}
              >
                {item.type === 'video' ? (
                  index === currentMediaIdx ? (
                    <VideoThumbnail uri={item.url} style={styles.postImage} />
                  ) : (
                    <View style={[styles.postImage, { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }]}>
                      <MaterialCommunityIcons name="play-circle" size={70} color="rgba(255,255,255,0.9)" />
                    </View>
                  )
                ) : (
                  <Image
                    source={{ uri: item.url }}
                    style={styles.postImage}
                    resizeMode="cover"
                    onLoad={index === 0 ? (e) => {
                      const { width: w, height: h } = e.nativeEvent.source;
                      if (w > 0 && h > 0) {
                        coverAspectCache.set(item.url, w / h);
                        setCoverAspectRatio(w / h);
                      }
                    } : undefined}
                  />
                )}
              </TouchableOpacity>
            )}
          />
          {mediaList.length > 1 && (
            <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              {mediaList.map((_, i) => (
                <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === currentMediaIdx ? '#FFF' : 'rgba(255,255,255,0.5)' }} />
              ))}
            </View>
          )}
        </View>

        {/* INTERACTION BAR */}
        <View style={styles.interactionBar}>
          <View style={styles.leftIcons}>
            <TouchableOpacity onPress={handleLike} style={styles.iconButton}>
              <MaterialCommunityIcons name={liked ? 'thumb-up' : 'thumb-up-outline'} size={22} color={liked ? '#9DBD3F' : colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => onOpenComments(post)}
            >
              <Feather name="message-circle" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Feather name="send" size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.viewsContainer}>
              <Feather name="bar-chart-2" size={16} color={isDark ? '#888' : '#666'} />
              <Text style={[styles.viewsText, { color: isDark ? '#888' : '#666' }]}>{formatViews(postViews)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
            <MaterialCommunityIcons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? '#9DBD3F' : colors.text} />
          </TouchableOpacity>
        </View>

        {/* DESCRIPTION */}
        <View style={[styles.descriptionCard, { backgroundColor: isDark ? '#1C1C1C' : '#F5F5F5' }]}>
          <Text style={[styles.descriptionTitle, { color: colors.text }]}>{post.title}</Text>
          <Text style={[styles.descriptionText, { color: isDark ? '#ccc' : '#444' }]}>
            {descExpanded || !isLongDescription ? fullDescription : `${truncatedDescription}... `}
            {isLongDescription && (
              <Text
                style={styles.seeMoreText}
                onPress={() => setDescExpanded(!descExpanded)}
              >
                {descExpanded ? ' ver menos' : 'ver más'}
              </Text>
            )}
          </Text>

          {post.webLink && (
            <TouchableOpacity style={styles.webLinkRow} onPress={handleOpenLink} activeOpacity={0.7}>
              <Feather name="link" size={14} color="#9DBD3F" />
              <Text style={styles.webLinkText} numberOfLines={1}>
                {post.webLink}
              </Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
    </View>
  );
});

// ============================================================
// COMPONENTE PRINCIPAL: PostDetailScreen
// ============================================================
export default function PostDetailScreen({ route, navigation }) {
  const { post, posts = [] } = route.params;

  // 🔧 El guard de "post inválido" tiene que ir ANTES de cualquier hook.
  // Estaba después de ~24 hooks y antes de otros ~16, violando las
  // Reglas de los Hooks (podía tirar "Rendered fewer hooks than expected").
  if (!post) return null;

  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';
  const currentUser = auth.currentUser;
  const [containerH, setContainerH] = useState(screenHeight - insets.top);
  const [headerH, setHeaderH] = useState(50);
  const PAGE_HEIGHT = containerH - headerH;
  const layoutReady = useRef(false);
  const [postsList, setPostsList] = useState(posts);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisiblePost, setLastVisiblePost] = useState(null);
  const initialIndex = postsList.findIndex((p) => p.id === post.id);
  const validIndex = initialIndex >= 0 ? initialIndex : 0;
  const [isReady, setIsReady] = useState(validIndex === 0);
  const [mediaViewerPost, setMediaViewerPost] = useState(null);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [commentsPost, setCommentsPost] = useState(null);
  const [menuPost, setMenuPost] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [infoPostId, setInfoPostId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportPostData, setReportPostData] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePostData, setDeletePostData] = useState(null); // 🔧 guarda el post a borrar (menuPost se vacía antes de confirmar)
  const [toastMessage, setToastMessage] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef(null);

  const showToast = (message) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToastMessage(''));
    }, 3000);
  };

  const handleDeletePost = async () => {
    if (!deletePostData) return; // 🔧 sin post guardado no hay nada que borrar
    try {
      const postId = deletePostData.id;
      await deleteDoc(doc(db, 'posts', postId));
      const allMedia = deletePostData.media || (deletePostData.image ? [{ url: deletePostData.image, type: 'image' }] : []);
      for (const m of allMedia) {
        deleteMediaFromCloudinary(m.url).catch(() => {});
      }
      const collections = ['likes', 'views', 'saved', 'comments'];
      for (const col of collections) {
        try {
          const q = query(collection(db, col), where('postId', '==', postId));
          const snap = await getDocs(q);
          for (const d of snap.docs) {
            try { await deleteDoc(d.ref); } catch (e) {}
          }
        } catch (e) {}
      }
      setDeleteModalVisible(false);
      setDeletePostData(null);
      navigation.goBack();
    } catch (error) {
      console.log('Error eliminando publicación:', error);
      setDeleteModalVisible(false);
      setDeletePostData(null);
      showToast('Error al eliminar la publicación');
    }
  };

  const flatListRef = useRef(null);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    if (flatListRef.current && validIndex > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: validIndex, animated: false });
      }, 100);
    }
  }, [containerH, headerH]);

  const onScrollToIndexFailed = useCallback((info) => {
    if (flatListRef.current) {
      const approxOffset = info.averageItemLength
        ? info.averageItemLength * info.index
        : PAGE_HEIGHT * info.index;
      flatListRef.current.scrollToOffset({ offset: approxOffset, animated: false });
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
      }, 100);
    }
  }, [PAGE_HEIGHT]);

  const viewedPosts = useRef(new Set());

  const incrementView = async (postId) => {
    if (!currentUser || !postId || viewedPosts.current.has(postId)) return;
    viewedPosts.current.add(postId);

    const viewDocId = `${currentUser.uid}_${postId}`;
    const viewRef = doc(db, 'views', viewDocId);
    const postRef = doc(db, 'posts', postId);

    try {
      const snap = await getDoc(viewRef);
      if (!snap.exists()) {
        await setDoc(viewRef, {
          userId: currentUser.uid,
          postId: postId,
          createdAt: new Date(),
        });
        await updateDoc(postRef, { vistas: increment(1) });

        // 🆕 Reflejar el nuevo conteo localmente (por si se scrollea entre posts acá mismo)
        setPostsList(prev =>
          prev.map(p => (p.id === postId ? { ...p, views: (p.views || 0) + 1 } : p))
        );
        // 🆕 Avisarle a HomeScreen (u otra pantalla) que este post sumó una vista
        emitViewIncrement(postId);
      }
    } catch (error) {
      console.log('Error incrementando vista:', error);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    viewableItems.forEach((item) => {
      if (item.isViewable && item.item?.id) {
        incrementView(item.item.id);
        if (item.item.id === post.id) setIsReady(true); // 🆕 ya se asentó en el post correcto
      }
    });
  });

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 });

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMore) return;
    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const lastPost = postsList[postsList.length - 1];
      if (!lastPost) { return; }
      const lastDocSnap = await getDoc(doc(db, 'posts', lastPost.id));
      if (!lastDocSnap.exists()) { return; }
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDocSnap),
        limit(10)
      );
      const snap = await getDocs(q);
      const newDocs = snap.docs.map(d => {
        const data = d.data();
        const mediaArray = data.media || (data.imagenes || []).map(url => ({ url, type: 'image' }));
        return {
          id: d.id,
          title: data.titulo || 'Sin título',
          image: mediaArray.length > 0 ? mediaArray[0].url : 'https://picsum.photos/seed/placeholder/400/300',
          price: data.precio ? `${data.precio}$` : null,
          views: data.vistas || 0,
          totalImages: mediaArray.length,
          media: mediaArray,
          hasVideo: mediaArray.some(m => m.type === 'video'),
          description: data.descripcion || '',
          webLink: data.webLink || null,
          author: data.autor,
        };
      });
      if (newDocs.length > 0) {
        setPostsList(prev => {
          const existingIds = new Set(prev.map(p => p.id)); // 🆕 evita duplicados aunque se cuele una carga doble
          const uniqueNewDocs = newDocs.filter(d => !existingIds.has(d.id));
          return [...prev, ...uniqueNewDocs];
        });
      }
      setHasMore(snap.docs.length === 10);
    } catch (e) {
      console.log('Error loading more posts:', e);
    } finally {
      isLoadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, postsList]);

  useEffect(() => {
    postsList.forEach((p) => {
      const coverItem = (p.media && p.media.length > 0) ? p.media[0] : { url: p.image, type: 'image' };
      if (!coverItem.url || coverItem.type === 'video' || coverAspectCache.has(coverItem.url)) return;
      Image.getSize(
        coverItem.url,
        (w, h) => { if (w > 0 && h > 0) coverAspectCache.set(coverItem.url, w / h); },
        () => {}
      );
    });
  }, [postsList]);

  const handlePostUpdated = useCallback((postId, updatedFields) => {
    setPostsList((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updatedFields } : p)));
  }, []);

  // 🔧 useCallback en vez de useRef: con useRef la función quedaba "congelada"
  // con el postsList del primer render, así que nunca detectaba los posts
  // cargados después con loadMorePosts. A diferencia de onViewableItemsChanged,
  // el prop onScroll de FlatList no necesita mantener la misma identidad.
  const onScroll = useCallback((e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / PAGE_HEIGHT);
    if (postsList[index]?.id) {
      incrementView(postsList[index].id);
    }
  }, [PAGE_HEIGHT, postsList]);

  const handleOpenMediaViewer = useCallback((post, index) => {
    setMediaViewerPost(post);
    setMediaViewerIndex(index);
  }, []);

  const handleOpenComments = useCallback((post) => {
    setCommentsPost(post);
  }, []);

  const handleAuthorPress = useCallback((author, profileName, username, profilePicture) => {
    if (currentUser && author === currentUser.uid) {
      navigation.navigate('MainTabs', { screen: 'Profile' });
    } else {
      navigation.navigate('UserProfile', {
        userId: author,
        profileName: profileName || 'Usuario',
        username: username || 'usuario',
        profilePicture: profilePicture || '',
      });
    }
  }, [currentUser, navigation]);

  const handleMorePress = useCallback(async (anchor, post) => {
    let muted = false;
    let blocked = false;
    if (currentUser && post.author !== currentUser.uid) {
      muted = await checkIfMuted(currentUser.uid, post.author);
      blocked = await checkIfBlocked(currentUser.uid, post.author);
    }
    setIsMuted(muted);
    setIsBlocked(blocked);
    setMenuAnchor(anchor);
    setMenuPost(post);
  }, [currentUser]);

  const renderPostItem = useCallback(({ item }) => (
    <PostItem
      post={item}
      isOwnPost={currentUser && item.author === currentUser.uid}
      displayName={item.authorProfileName || 'Usuario'}
      displayHandle={'@' + (item.authorUsername || 'usuario')}
      authorProfilePicture={item.authorProfilePicture || ''}
      onOpenMediaViewer={handleOpenMediaViewer}
      onOpenComments={handleOpenComments}
      onAuthorPress={() => handleAuthorPress(item.author, item.authorProfileName, item.authorUsername, item.authorProfilePicture)}
      onMorePress={(anchor) => handleMorePress(anchor, item)}
      colors={colors}
      isDark={isDark}
      pageHeight={PAGE_HEIGHT}
    />
  ), [currentUser, colors, isDark, PAGE_HEIGHT, handleOpenMediaViewer, handleOpenComments, handleAuthorPress, handleMorePress]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.card, paddingTop: insets.top }]} onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}>
        {/* HEADER */}
        <View onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} style={[styles.header, { borderBottomColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>PUBLICACIONES</Text>
          <View style={{ width: 28 }} />
        </View>

      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: insets.bottom,
          }}
          data={postsList}
          keyExtractor={(item) => item.id}
          initialScrollIndex={validIndex}
          initialNumToRender={1}
          renderItem={renderPostItem}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          onScroll={onScroll}
          scrollEventThrottle={16}
          horizontal={false}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          windowSize={7}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#546F1C" style={{ marginVertical: 20 }} /> : null}
          onScrollToIndexFailed={onScrollToIndexFailed}
          keyboardShouldPersistTaps="handled"
        />
          {!isReady && (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' }]}
              pointerEvents="none"
            >
              <ActivityIndicator size="small" color="#546F1C" />
            </View>
          )}
      </View>
      </View>
      <CommentModal
        visible={commentsPost !== null}
        post={commentsPost}
        onClose={() => setCommentsPost(null)}
        isDark={isDark}
        colors={colors}
      />
      <PostMenuModal
        visible={menuPost !== null}
        onClose={() => setMenuPost(null)}
        isOwnPost={currentUser && menuPost?.author === currentUser.uid}
        isMuted={isMuted}
        isBlocked={isBlocked}
        anchorPosition={menuAnchor}
        onOptionPress={(key) => {
          if (key === 'mute') {
            Alert.alert(
              'Silenciar usuario',
              `¿Querés silenciar a ${menuPost?.authorProfileName || 'este usuario'}? No verás sus publicaciones en tu feed.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Silenciar',
                  onPress: async () => {
                    const ok = await muteUser(currentUser.uid, menuPost.author);
                    if (ok) {
                      emitMuteUser(menuPost.author);
                      setMenuPost(null);
                      navigation.goBack();
                    }
                  },
                },
              ]
            );
          }
          if (key === 'unmute') {
            unmuteUser(currentUser.uid, menuPost.author).then(() => {
              setMenuPost(null);
              navigation.goBack();
            });
          }
          if (key === 'report') {
            setMenuPost(null);
            setReportPostData(menuPost);
            setReportModalVisible(true);
          }
          if (key === 'block') {
            Alert.alert(
              'Bloquear usuario',
              `¿Querés bloquear a ${menuPost?.authorProfileName || 'este usuario'}? No verás sus publicaciones ni podrán interactuar.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Bloquear',
                  style: 'destructive',
                  onPress: () => {
                    // Actualización optimista: avisamos y salimos ya mismo,
                    // sin esperar a que vuelvan las llamadas a Firestore.
                    const targetUid = menuPost.author;
                    emitBlockUser(targetUid);
                    setMenuPost(null);
                    navigation.goBack();
                    (async () => {
                      const [isFollowing] = await Promise.all([
                        checkIfFollowing(currentUser.uid, targetUid),
                        blockUser(currentUser.uid, targetUid),
                      ]);
                      if (isFollowing) {
                        await unfollowUser(currentUser.uid, targetUid);
                      }
                    })();
                  },
                },
              ]
            );
          }
          if (key === 'unblock') {
            unblockUser(currentUser.uid, menuPost.author).then(() => {
              setIsBlocked(false);
              setMenuPost(null);
            });
          }
          if (key === 'delete') {
            setDeletePostData(menuPost); // 🔧 se captura ANTES de vaciar menuPost
            setMenuPost(null);
            setDeleteModalVisible(true);
          }
          if (key === 'edit') {
            setMenuPost(null);
            navigation.navigate('EditPost', { post: menuPost, onSave: handlePostUpdated });
          }
          if (key === 'reportData') {
            setInfoPostId(menuPost.id);
            setMenuPost(null);
          }
        }}
      />
      <MediaViewerModal
        visible={mediaViewerPost !== null}
        items={mediaViewerPost ? (mediaViewerPost.media || [{ url: mediaViewerPost.image, type: 'image' }]).map((m, i) => ({ id: `${mediaViewerPost.id}_${i}`, mediaUrl: m.url, type: m.type })) : []}
        initialIndex={mediaViewerIndex || 0}
        onClose={() => { setMediaViewerPost(null); setMediaViewerIndex(0); }}
      />
      <PostInfoModal
        visible={infoPostId !== null}
        postId={infoPostId}
        onClose={() => setInfoPostId(null)}
      />
      <Modal visible={reportModalVisible} transparent animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setReportModalVisible(false)}>
          <View style={styles.reportOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.reportModal, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                <TouchableOpacity
                  style={styles.reportCloseBtn}
                  onPress={() => setReportModalVisible(false)}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Ionicons name="close-circle" size={26} color={isDark ? '#48484A' : '#C7C7CC'} />
                </TouchableOpacity>

                <View style={styles.reportHeader}>
                  <View style={[styles.reportIconBadge, { backgroundColor: isDark ? '#3A2020' : '#FFEBEE' }]}>
                    <Feather name="flag" size={22} color="#E53935" />
                  </View>
                  <Text style={[styles.reportTitle, { color: colors.text }]}>Denunciar publicación</Text>
                  <Text style={[styles.reportSubtitle, { color: isDark ? '#8E8E93' : '#666' }]}>
                    Ayúdanos a entender el problema con esta publicación
                  </Text>
                </View>

                <View style={[styles.reportOptionsWrapper, { backgroundColor: isDark ? '#2C2C2E' : '#F8F8F8' }]}>
                  {[
                    'Acoso o intimidación',
                    'Discurso de odio',
                    'Contenido sexual o desnudos',
                    'Violencia o contenido gráfico',
                    'Estafas o fraude',
                    'Información falsa o engañosa',
                    'Spam',
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
                        if (reportPostData) {
                          reportPost(currentUser.uid, reportPostData.id, reason);
                        }
                        showToast('Publicación denunciada');
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
      <Modal visible={deleteModalVisible} transparent animationType="slide" onRequestClose={() => { setDeleteModalVisible(false); setDeletePostData(null); }}>
        <TouchableWithoutFeedback onPress={() => { setDeleteModalVisible(false); setDeletePostData(null); }}>
          <View style={styles.reportOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.reportModal, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                <TouchableOpacity
                  style={styles.reportCloseBtn}
                  onPress={() => { setDeleteModalVisible(false); setDeletePostData(null); }}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Ionicons name="close-circle" size={26} color={isDark ? '#48484A' : '#C7C7CC'} />
                </TouchableOpacity>

                <View style={styles.reportHeader}>
                  <View style={[styles.reportIconBadge, { backgroundColor: isDark ? '#3A2020' : '#FFEBEE' }]}>
                    <Ionicons name="trash-outline" size={24} color="#E53935" />
                  </View>
                  <Text style={[styles.reportTitle, { color: colors.text }]}>Eliminar publicación</Text>
                  <Text style={[styles.reportSubtitle, { color: isDark ? '#8E8E93' : '#666' }]}>
                    ¿Querés eliminar esta publicación? Esta acción no se puede deshacer.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                    onPress={() => { setDeleteModalVisible(false); setDeletePostData(null); }}
                    activeOpacity={0.6}
                  >
                    <Text style={{ color: colors.text, fontFamily: 'Nunito-Bold', fontSize: 15 }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#E53935', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                    onPress={handleDeletePost}
                    activeOpacity={0.6}
                  >
                    <Text style={{ color: '#FFFFFF', fontFamily: 'Nunito-Bold', fontSize: 15 }}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {toastMessage !== '' && (
        <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }] }]}>
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  moreButton: { padding: 4 },
  userInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  avatarContainer: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  userNameContainer: { marginLeft: 8, flex: 1 },
  userNameText: { fontSize: 13, fontWeight: '600' },
  userHandleText: { fontSize: 11 },
  imageWrapper: { width: screenWidth, position: 'relative' },
  postImage: { width: '100%', height: '100%' },
  playButtonOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  priceOverlay: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  priceText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  interactionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  leftIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginRight: 14 },
  viewsContainer: { flexDirection: 'row', alignItems: 'center' },
  viewsText: { fontSize: 12, marginLeft: 3 },
  descriptionCard: { marginHorizontal: 12, marginBottom: 6, padding: 10, borderRadius: 8 },
  descriptionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  descriptionText: { fontSize: 13, lineHeight: 18 },
  seeMoreText: { fontSize: 14, fontWeight: '700', color: '#9DBD3F' },
  webLinkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  webLinkText: { fontSize: 13, color: '#9DBD3F', flex: 1, textDecorationLine: 'underline' },
  reportOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  reportModal: { width: '100%', maxWidth: 400, borderRadius: 20, padding: 24, paddingTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 15 },
  reportCloseBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
  reportHeader: { alignItems: 'center', marginBottom: 24, marginTop: 12 },
  reportIconBadge: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  reportTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', marginBottom: 8, textAlign: 'center' },
  reportSubtitle: { fontSize: 14, fontFamily: 'Nunito-Regular', textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },
  reportOptionsWrapper: { borderRadius: 12, overflow: 'hidden' },
  reportOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1 },
  reportOptionText: { fontSize: 15, fontFamily: 'Nunito-SemiBold', flex: 1 },
  toast: { position: 'absolute', top: 60, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#27AE60', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, gap: 10, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  toastText: { color: '#FFF', fontSize: 14, fontFamily: 'Nunito-Bold', flex: 1 },
});