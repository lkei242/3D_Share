// mobile-expo/src/screens/SearchScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { collection, query, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';
import { db } from './config/firebase';
import { formatViews } from './config/formatViews';

export default function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // Estado para la barra de búsqueda

  const fetchPosts = async (reset = false) => {
    if (loading) return;
    if (!reset && !hasMore) return;

    setLoading(true);

    try {
      const postsRef = collection(db, 'posts');
      let q;

      if (reset) {
        q = query(postsRef, orderBy('createdAt', 'desc'), limit(30));
      } else if (lastVisible) {
        q = query(postsRef, orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(30));
      } else {
        setLoading(false);
        return;
      }

      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({
        id: doc.id,
        image: doc.data().imagenes && doc.data().imagenes.length > 0 ? doc.data().imagenes[0] : 'https://picsum.photos/seed/placeholder/400/300',
        title: doc.data().titulo || '',
        description: doc.data().descripcion || '',
        price: doc.data().precio ? `${doc.data().precio}$` : null,
        views: formatViews(doc.data().vistas || 0),
        author: doc.data().autor
      }));

      const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastVisibleDoc);

      if (reset) {
        setPosts(list);
      } else {
        setPosts(prev => [...prev, ...list]);
      }

      setHasMore(querySnapshot.docs.length === 30);
    } catch (error) {
      console.log("Error buscando posts en Firestore:", error);
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

  // Filtrado reactivo en memoria según el título escrito
  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PostDetail', { post: item, posts: filteredPosts })}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.image}
      />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5', paddingTop: insets.top + 8 }]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
        />

        <View style={[styles.searchBar, { backgroundColor: isDark ? '#273500' : '#E8E8E8' }]}>
          <Ionicons
            name="search"
            size={20}
            color={isDark ? '#FFF' : '#666'}
          />

          <TextInput
            placeholder="Buscar por título..."
            placeholderTextColor={isDark ? '#AAA' : '#888'}
            style={[styles.input, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Grid de Resultados */}
      <FlatList
        data={filteredPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        onEndReached={() => fetchPosts(false)}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color="#9DBD3F"
              style={{ marginVertical: 15 }}
            />
          ) : null
        }
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
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  logo: {
    width: 35,
    height: 35,
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 0,
  },
  card: {
    width: '33.333%',
    aspectRatio: 1,
    padding: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});