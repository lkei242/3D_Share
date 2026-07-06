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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { blockUser } from '../config/userActions';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ============================================================
// 🆕 COMPONENTE: VideoThumbnail (miniatura estática, no interactiva)
// El toque para reproducir/ver en grande lo maneja el TouchableOpacity
// exterior del carrusel, igual que con las imágenes: así abrir un video
// se siente idéntico a abrir una imagen (mismo modal, mismo gesto).
// ============================================================
const VideoThumbnail = React.memo(function VideoThumbnail({ uri, style }) {
  const player = useVideoPlayer(uri, (playerInstance) => {
    playerInstance.loop = false;
    playerInstance.muted = true;
    // No reproducir acá: esto es solo una miniatura (primer frame).
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

// ============================================================
// COMPONENTE: PostItem (un post individual, autónomo)
// ============================================================
const PostItem = React.memo(function PostItem({ post, isOwnPost, displayName, displayHandle, authorProfilePicture, colors, isDark, pageHeight, onOpenComments, onAuthorPress, onMorePress, onOpenMediaViewer }) {
  const currentUser = auth.currentUser;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [currentMediaIdx, setCurrentMediaIdx] = useState(0);
  const moreButtonRef = React.useRef(null);

  useEffect(() => {
    if (!currentUser || !post) return;
    let cancelled = false;
    const savedRef = doc(db, 'saved', `${currentUser.uid}_${post.id}`);
    getDoc(savedRef).then((snap) => {
      if (!cancelled) setSaved(snap.exists());
    });
    return () => { cancelled = true; };
  }, [post.id, currentUser?.uid]);
  const mediaList = post.media && post.media.length > 0 ? post.media : [{ url: post.image, type: 'image' }];
  const postViews = post.views || 0;

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
    }
  };

  return (
    <View
      style={{
        height: pageHeight,
        backgroundColor: colors.background,
        position: 'relative',
      }}
    >
      {/* USER INFO */}
      <TouchableOpacity style={styles.userInfoRow} onPress={onAuthorPress} activeOpacity={0.7}>
        <View style={[styles.avatarContainer, { borderColor: colors.avatarborder }]}>
          {authorProfilePicture ? (
            <Image source={{ uri: authorProfilePicture }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
              <Ionicons name="person-circle-outline" size={38} color="#94BA46" />
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
      <View
        style={{
          flex: 1,
          height: pageHeight - 70,
        }}
      >
        {/* POST MEDIA CAROUSEL */}
        <View style={styles.imageWrapper}>
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
                  <Image source={{ uri: item.url }} style={styles.postImage} resizeMode="cover" />
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
              <Feather name="thumbs-up" size={22} color={liked ? '#9DBD3F' : colors.text} />
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
            <Feather name="bookmark" size={22} color={saved ? '#9DBD3F' : colors.text} />
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
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';
  const currentUser = auth.currentUser;
  const HEADER_HEIGHT = 50;
  const PAGE_HEIGHT = screenHeight - insets.top - HEADER_HEIGHT;
  const [postsList, setPostsList] = useState(posts);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisiblePost, setLastVisiblePost] = useState(null);
  const initialIndex = postsList.findIndex((p) => p.id === post.id);
  const validIndex = initialIndex >= 0 ? initialIndex : 0;
  const [mediaViewerPost, setMediaViewerPost] = useState(null);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [commentsPost, setCommentsPost] = useState(null);
  const [menuPost, setMenuPost] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [infoPostId, setInfoPostId] = useState(null);

  if (!post) return null;

  const flatListRef = useRef(null);

  const onScrollToIndexFailed = useCallback((info) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({
        offset: info.index * PAGE_HEIGHT,
        animated: false,
      });
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index: info.index,
            animated: false,
          });
        }
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
      }
    } catch (error) {
      console.log('Error incrementando vista:', error);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    viewableItems.forEach((item) => {
      if (item.isViewable && item.item?.id) {
        incrementView(item.item.id);
      }
    });
  });

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 });

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const lastPost = postsList[postsList.length - 1];
      if (!lastPost) { setLoadingMore(false); return; }
      const lastDocSnap = await getDoc(doc(db, 'posts', lastPost.id));
      if (!lastDocSnap.exists()) { setLoadingMore(false); return; }
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
        setPostsList(prev => [...prev, ...newDocs]);
      }
      setHasMore(snap.docs.length === 10);
    } catch (e) {
      console.log('Error loading more posts:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, postsList]);

  const handlePostUpdated = useCallback((postId, updatedFields) => {
    setPostsList((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updatedFields } : p)));
  }, []);

  const onScroll = useRef((e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / PAGE_HEIGHT);
    if (postsList[index]?.id) {
      incrementView(postsList[index].id);
    }
  });

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

  const handleMorePress = useCallback((anchor, post) => {
    setMenuAnchor(anchor);
    setMenuPost(post);
  }, []);

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
      <View style={[styles.container, { backgroundColor: colors.card, paddingTop: insets.top }]}>
        {/* HEADER */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>PUBLICACIONES</Text>
          <View style={{ width: 28 }} />
        </View>

        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: 20,
          }}
          data={postsList}
          keyExtractor={(item) => item.id}
          initialScrollIndex={validIndex}
          initialNumToRender={1}
          getItemLayout={(data, index) => ({
            length: PAGE_HEIGHT,
            offset: PAGE_HEIGHT * index,
            index,
          })}
          renderItem={renderPostItem}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          onScroll={onScroll.current}
          scrollEventThrottle={16}
          horizontal={false}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          windowSize={3}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#546F1C" style={{ marginVertical: 20 }} /> : null}
          onScrollToIndexFailed={onScrollToIndexFailed}
          keyboardShouldPersistTaps="handled"
        />
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
        anchorPosition={menuAnchor}
        onOptionPress={(key) => {
          if (key === 'block') {
            Alert.alert(
              'Bloquear usuario',
              `¿Querés bloquear a ${menuPost?.authorProfileName || 'este usuario'}? No verás sus publicaciones ni podrán interactuar.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Bloquear',
                  style: 'destructive',
                  onPress: async () => {
                    const ok = await blockUser(currentUser.uid, menuPost.author);
                    if (ok) {
                      setMenuPost(null);
                      navigation.goBack();
                    }
                  },
                },
              ]
            );
          }
          if (key === 'delete') {
            Alert.alert(
              'Eliminar publicación',
              '¿Querés eliminar esta publicación? Esta acción no se puede deshacer.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const postId = menuPost.id;
                      await deleteDoc(doc(db, 'posts', postId));
                      const allMedia = menuPost.media || (menuPost.image ? [{ url: menuPost.image, type: 'image' }] : []);
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
                      setMenuPost(null);
                      navigation.goBack();
                    } catch (error) {
                      console.log('Error eliminando publicación:', error);
                      Alert.alert('Error', 'No se pudo eliminar la publicación. Revisá tu conexión o intentá de nuevo.');
                    }
                  },
                },
              ]
            );
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
    </KeyboardAvoidingView>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  moreButton: { padding: 4 },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: 40.7,
    height: 40.7,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userNameContainer: { marginLeft: 10, flex: 1 },
  userNameText: { fontSize: 15, fontWeight: '600' },
  userHandleText: { fontSize: 13 },
  imageWrapper: {
    width: screenWidth,
    flex: 1,
    position: 'relative',
  },
  postImage: { width: '100%', height: '100%' },
  // 🆕 Estilos para el botón de play overlay
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)', // Sombra sutil para resaltar el botón
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  interactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  leftIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginRight: 16 },
  viewsContainer: { flexDirection: 'row', alignItems: 'center' },
  viewsText: { fontSize: 13, marginLeft: 4 },
  descriptionCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
  },
  descriptionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  descriptionText: { fontSize: 14, lineHeight: 20 },
  seeMoreText: { fontSize: 14, fontWeight: '700', color: '#9DBD3F' },
  webLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  webLinkText: { fontSize: 13, color: '#9DBD3F', flex: 1, textDecorationLine: 'underline' }
});