
import React, { useState, useEffect, useRef, useCallback } from 'react'; 
import { collection, query, orderBy, getDocs, limit, startAfter, doc, getDoc, setDoc, deleteDoc, where } from 'firebase/firestore';
import { auth, db } from './config/firebase';
import { formatViews } from './config/formatViews';
import { getBlockedUids } from './config/userActions';
import { getMutedUids } from './config/userActions';
import { subscribeViewIncrement } from './config/ViewsBus';
import { subscribeBlockUser } from './config/BlockBus';
import { subscribeMuteUser } from './config/MuteBus';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video'; 
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

const GREEN = '#9DBD3F';
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 20) / 2;




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
      style={styles.cardImage}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
      nativeControls={false} 
    />
  );
});




const PostCard = React.memo(function PostCard({ item, onPress, isVisible }) { 
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';
  const [saved, setSaved] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const savedRef = doc(db, 'saved', `${currentUser.uid}_${item.id}`);
    getDoc(savedRef).then((snap) => {
      if (!cancelled) setSaved(snap.exists());
    });
    return () => { cancelled = true; };
  }, [item.id, currentUser?.uid]);

  const handleSave = async () => {
    if (!currentUser) return;
    try {
      const savedRef = doc(db, 'saved', `${currentUser.uid}_${item.id}`);
      if (saved) {
        await deleteDoc(savedRef);
        setSaved(false);
      } else {
        await setDoc(savedRef, {
          userId: currentUser.uid,
          postId: item.id,
          postImage: item.image,
          postTitle: item.title,
          postAuthor: item.author,
          createdAt: new Date(),
        });
        setSaved(true);
      }
    } catch (error) {
      console.log('Error al guardar:', error);
    }
  };

  
  const firstMedia = item.media[0];
const isFirstMediaVideo = firstMedia?.type === 'video';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {}
      <View style={{ position: 'relative' }}>
        {}
        {isFirstMediaVideo ? (
          <VideoPreview uri={firstMedia.url} isVisible={isVisible} />
        ) : (
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}

        {}
        {isFirstMediaVideo && (
          <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="video" size={14} color="#FFF" />
          </View>
        )}

        {item.totalImages > 1 && (
          <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
            <Text style={{ color: '#FFF', fontSize: 11, fontFamily: 'Nunito-Bold' }}>1/{item.totalImages}</Text>
          </View>
        )}
      </View>

      {}
      <View style={[styles.cardFooter, { backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9' }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.cardStats}>
          <MaterialCommunityIcons name="chart-bar" size={16} color={isDark ? "#aaa" : "#666"} />
          <Text style={[styles.statsText, { color: isDark ? "#888" : "#555" }]}>{formatViews(item.views)}</Text>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <MaterialCommunityIcons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={20}
              color={saved ? "#9DBD3F" : colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});


export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [blockedUids, setBlockedUids] = useState([]);
  const [mutedUids, setMutedUids] = useState([]);
  const [followingUids, setFollowingUids] = useState([]);
  const [hasFollowing, setHasFollowing] = useState(true);
  const [visibleItems, setVisibleItems] = useState(new Set()); 

  const handlePostPress = useCallback((post) => {
    navigation.navigate('PostDetail', {
      post,
      posts: postsListRef.current, 
    });
  }, [navigation]);

  
  
  
  
  
  
  
  const postsListRef = useRef(posts);
  useEffect(() => {
    postsListRef.current = posts;
  }, [posts]);

  
  const updatePostViews = (postId) => {
    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, views: (p.views || 0) + 1 } : p))
    );
  };

  
  useEffect(() => {
    const unsubscribe = subscribeViewIncrement(updatePostViews);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeBlockUser((blockedUid) => {
      setBlockedUids(prev => [...prev, blockedUid]);
      setPosts(prev => prev.filter(p => p.author !== blockedUid));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeMuteUser((mutedUid) => {
      setMutedUids(prev => [...prev, mutedUid]);
      setPosts(prev => prev.filter(p => p.author !== mutedUid));
    });
    return unsubscribe;
  }, []);

  const [lastVisible, setLastVisible] = useState(null);

  const fetchBlockedUsers = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const blocked = await getBlockedUids(user.uid);
    setBlockedUids(blocked);
  };

  const fetchMutedUsers = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const muted = await getMutedUids(user.uid);
    setMutedUids(muted);
  };

  const fetchFollowingUids = async () => {
    const user = auth.currentUser;
    if (!user) return [];
    try {
      const q = query(collection(db, 'followers'), where('followerId', '==', user.uid));
      const snap = await getDocs(q);
      const uids = snap.docs.map(d => d.data().userId);
      setFollowingUids(uids);
      setHasFollowing(uids.length > 0);
      return uids;
    } catch (error) {
      console.log('Error fetching following:', error);
      setHasFollowing(false);
      return [];
    }
  };

  const fetchPosts = async (reset = false) => {
    if (loading || (!hasMore && !reset)) return;
    setLoading(true);
    try {
      let uids = followingUids;
      if (reset || uids.length === 0) {
        uids = await fetchFollowingUids();
      }

      if (uids.length === 0) {
        setPosts([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const postsRef = collection(db, 'posts');
      let q;

      if (uids.length <= 30) {
        if (reset) {
          q = query(postsRef, where('autor', 'in', uids), orderBy('createdAt', 'desc'), limit(10));
        } else if (lastVisible) {
          q = query(postsRef, where('autor', 'in', uids), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(10));
        } else {
          setLoading(false);
          return;
        }
      } else {
        if (reset) {
          q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));
        } else if (lastVisible) {
          q = query(postsRef, orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(50));
        } else {
          setLoading(false);
          return;
        }
      }

      const documentSnapshots = await getDocs(q);

      const authorUids = [...new Set(documentSnapshots.docs.map(d => d.data().autor).filter(Boolean))];

      const authorsMap = {};
      if (authorUids.length > 0) {
          for (let i = 0; i < authorUids.length; i += 10) {
              const chunk = authorUids.slice(i, i + 10);
              const userPromises = chunk.map(uid => getDoc(doc(db, 'users', uid)));
              const userSnaps = await Promise.all(userPromises);
              userSnaps.forEach(uDoc => {
                  if (uDoc.exists()) {
                      const d = uDoc.data();
                      authorsMap[uDoc.id] = {
                          profileName: d.profileName || d.username || 'Usuario',
                          username: d.username || 'usuario',
                          profilePicture: d.profilePicture || '',
                      };
                  }
              });
          }
      }

      const newPosts = documentSnapshots.docs.map(d => {
          const data = d.data();
          const authorInfo = authorsMap[data.autor] || { profileName: 'Usuario', username: 'usuario', profilePicture: '' };
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
              authorProfileName: authorInfo.profileName,
              authorUsername: authorInfo.username,
              authorProfilePicture: authorInfo.profilePicture,
          };
      }).filter(p => uids.includes(p.author) && !blockedUids.includes(p.author) && !mutedUids.includes(p.author));
      const lastVisibleDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
      setLastVisible(lastVisibleDoc);
      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      const pageSize = uids.length <= 30 ? 10 : 50;
      setHasMore(documentSnapshots.docs.length === pageSize);
    } catch (error) {
      console.log("Error cargando posts de Firestore:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setLastVisible(null);
    setHasMore(true);
    await fetchBlockedUsers();
    await fetchMutedUsers();
    await fetchPosts(true);
    setRefreshing(false);
  };

  const isFirstFocus = useRef(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        Promise.all([fetchBlockedUsers(), fetchMutedUsers(), fetchFollowingUids().then(() => fetchPosts(true))]);
      } else {
        fetchBlockedUsers();
        fetchMutedUsers();
        fetchFollowingUids().then(() => {
          setLastVisible(null);
          setHasMore(true);
          fetchPosts(true);
        });
      }
    });
    return unsubscribe;
  }, [navigation]);

  
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const visibleIds = new Set(viewableItems.map(item => item.item.id));
    setVisibleItems(visibleIds);
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50 
  });

  const renderItem = React.useCallback(({ item }) => (
    <PostCard
      item={item}
      onPress={() => handlePostPress(item)}
      isVisible={visibleItems.has(item.id)} 
    />
  ), [visibleItems, handlePostPress]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {}
      <View style={[styles.header, { backgroundColor: isDark ? '#1C1C1C' : '#F5F5F5', paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Publish')}>
          <View style={styles.publishButtonContainer}>
            <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.text} />
            <Text style={[styles.headerButtonText, { color: colors.text }]}>Publicar</Text>
          </View>
        </TouchableOpacity>

        <Image
          source={require('../../assets/logo.png')}
          style={styles.headerLogo}
        />

        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('SavedScreen')}>
          <Text style={[styles.headerButtonText, { color: colors.text }]}>Guardado</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => fetchPosts(false)}
        onEndReachedThreshold={0.3}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={7}
        initialNumToRender={10}
        
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#546F1C']}
            tintColor="#546F1C"
          />
        }
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#546F1C" style={{ marginVertical: 15 }} /> : null}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name={hasFollowing ? "account-group-outline" : "account-plus-outline"}
              size={70}
              color={isDark ? '#555' : '#bbb'}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {hasFollowing ? 'Sin publicaciones por ahora' : 'No sigues a nadie'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#888' : '#999' }]}>
              {hasFollowing
                ? 'Tus seguidores no tienen publicaciones recientes.'
                : 'Busca usuarios y sigue sus perfiles para ver sus publicaciones aquí.'}
            </Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerButton: {
    paddingVertical: 6,
  },
  publishButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerButtonText: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
  headerLogo: {
    width: 46,
    height: 46,
    transform: [{ translateX: -7 }],
  },
  listContent: {
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 175,
  },
  imageCounter: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Nunito-Bold',
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 52,
    left: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  priceText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  cardFooter: {
    paddingHorizontal: 10,
    paddingVertical: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
    marginBottom: 3,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    flex: 1,
  },
  saveButton: {
    padding: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});