import { API_URL } from './config/api';
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (reset = false) => {
    if (loading) return;

    if (!reset && !hasMore) return;

    setLoading(true);

    try {
      const pageToFetch = reset ? 1 : page;

      const res = await fetch(
        `${API_URL}/api/posts/feed?page=${pageToFetch}&limit=30`
      );

      const data = await res.json();

      if (reset) {
        setPosts(data.posts);
        setPage(2);
      } else {
        setPosts(prev => [...prev, ...data.posts]);
        setPage(prev => prev + 1);
      }

      setHasMore(data.hasMore);
    } catch (error) {
      console.log(error);
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
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('PostDetail', { post: item })
      }
    >
      <Image
        source={{ uri: item.image }}
        style={styles.image}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8 }
        ]}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
        />

        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color="#FFF"
          />

          <TextInput
            placeholder="Buscar"
            placeholderTextColor="#AAA"
            style={styles.input}
          />
        </View>
      </View>

      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        onEndReached={() => fetchPosts(false)}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator
              size="small"
              color="#9DBD3F"
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
    backgroundColor: '#111',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#1A1A1A',
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
    backgroundColor: '#273500',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },

  input: {
    flex: 1,
    color: '#FFF',
    marginLeft: 8,
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