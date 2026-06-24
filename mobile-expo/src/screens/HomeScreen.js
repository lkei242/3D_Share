
import PostDetailModal from './components/PostDetailModal';
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit, startAfter, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './config/firebase';
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

function PostCard({ item, onPress }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';
  const [saved, setSaved] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;
    const savedRef = doc(db, 'saved', `${currentUser.uid}_${item.id}`);
    getDoc(savedRef).then((snap) => {
      setSaved(snap.exists());
    });
  }, [item, currentUser]);

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
}


export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const handlePostPress = (post) => {
    setSelectedPost(post);
    setModalVisible(true);
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
      const newPosts = documentSnapshots.docs.map(doc => ({
        id: doc.id,
        title: doc.data().titulo || 'Sin título',
        image: doc.data().imagenes && doc.data().imagenes.length > 0 ? doc.data().imagenes[0] : 'https://picsum.photos/seed/placeholder/400/300',
        price: doc.data().precio ? `${doc.data().precio}$` : null,
        views: doc.data().vistas >= 1000 ? `${(doc.data().vistas / 1000).toFixed(1)}k` : (doc.data().vistas || 0).toString(),
        totalImages: doc.data().imagenes ? doc.data().imagenes.length : 1,
        description: doc.data().descripcion || '',
        author: doc.data().autor
      }));
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

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPosts(true);
    });
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }) => (
    <PostCard
      item={item}
      onPress={() => navigation.navigate('PostDetail', { post: item })}
    />
  );

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

        <TouchableOpacity style={styles.headerButton}>
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
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#546F1C" style={{ marginVertical: 15 }} /> : null}
      />
      <PostDetailModal
        visible={modalVisible}
        post={selectedPost}
        onClose={() => {
          setModalVisible(false);
          setSelectedPost(null);
        }}
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