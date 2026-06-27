// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit, startAfter, doc, getDoc, setDoc, deleteDoc, where } from 'firebase/firestore';
import { auth, db } from './config/firebase';
import { formatViews } from './config/formatViews';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';

const GREEN = '#9DBD3F';
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 20) / 2;

const PostCard = React.memo(function PostCard({ item, onPress }) {
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
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Imagen del post */}
      <Image
        source={{ uri: item.image }}
        style={styles.cardImage}
        resizeMode="cover"
      />

      {/* Footer con título y botón de guardado */}
      <View style={[styles.cardFooter, { backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9' }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.cardStats}>
          <MaterialCommunityIcons name="chart-bar" size={16} color={isDark ? "#aaa" : "#666"} />
          <Text style={[styles.statsText, { color: isDark ? "#888" : "#555" }]}>{item.views}</Text>
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
  const [hasMore, setHasMore] = useState(true);
  const handlePostPress = (post) => {
    navigation.navigate('PostDetail', {
      post,
      posts,
    });
  };

  const [lastVisible, setLastVisible] = useState(null);
  const fetchPosts = async (reset = false) => {
    if (loading || (!hasMore && !reset)) return;
    setLoading(true);
    try {
      const postsRef = collection(db, 'posts');
      let q;

      if (reset) {
        q = query(postsRef, orderBy('createdAt', 'desc'), limit(10));
      } else if (lastVisible) {
        q = query(postsRef, orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(10));
      } else {
        setLoading(false);
        return;
      }
      const documentSnapshots = await getDocs(q);

            // Obtener UIDs únicos de autores
      const authorUids = [...new Set(documentSnapshots.docs.map(d => d.data().autor).filter(Boolean))];

      // Cargar info de autores por document ID
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
          return {
              id: d.id,
              title: data.titulo || 'Sin título',
              image: data.imagenes && data.imagenes.length > 0 ? data.imagenes[0] : 'https://picsum.photos/seed/placeholder/400/300',
              price: data.precio ? `${data.precio}$` : null,
              views: formatViews(data.vistas || 0),
              totalImages: data.imagenes ? data.imagenes.length : 1,
              description: data.descripcion || '',
              author: data.autor,
              authorProfileName: authorInfo.profileName,
              authorUsername: authorInfo.username,
              authorProfilePicture: authorInfo.profilePicture,
          };
      });
      const lastVisibleDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
      setLastVisible(lastVisibleDoc);
      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      setHasMore(documentSnapshots.docs.length === 10);
    } catch (error) {
      console.log("Error cargando posts de Firestore:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasFetched = React.useRef(false);
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!hasFetched.current) {
        fetchPosts(true);
        hasFetched.current = true;
      }
    });
    return unsubscribe;
  }, [navigation]);

  const renderItem = React.useCallback(({ item }) => (
    <PostCard
      item={item}
      onPress={() => handlePostPress(item)}
    />
  ), [posts]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#0B0B0B' : '#F5F5F5', paddingTop: insets.top + 8 }]}>
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
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#546F1C" style={{ marginVertical: 15 }} /> : null}
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
});