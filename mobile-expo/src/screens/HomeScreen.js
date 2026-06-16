import { API_URL } from './config/api';
import React, { useState, useEffect } from 'react';
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
const CARD_WIDTH = (width - 36) / 2;

function PostCard({ item, onPress }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card }]} 
      onPress={onPress} 
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.cardImage}
        resizeMode="cover"
      />

      {item.totalImages > 1 && (
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>1/{item.totalImages}</Text>
        </View>
      )}

      {item.price && (
        <View style={styles.priceOverlay}>
          <Text style={styles.priceText}>{item.price}</Text>
        </View>
      )}

      <View style={[styles.cardFooter, { backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9' }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.cardStats}>
          <MaterialCommunityIcons name="chart-bar" size={14} color={isDark ? "#aaa" : "#666"} />
          <Text style={[styles.statsText, { color: isDark ? "#888" : "#555" }]}>{item.views}</Text>
          <TouchableOpacity style={styles.saveButton}>
            <MaterialCommunityIcons name="bookmark-outline" size={16} color={colors.text} />
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
  
  const fetchPosts = async (reset = false) => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const pageToFetch = reset ? 1 : page;
      const res = await fetch(`${API_URL}/api/posts/feed?page=${pageToFetch}&limit=10`);
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
      console.log("Error cargando posts:", error);
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
    <PostCard item={item} onPress={() => {}} />
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
        onEndReached={fetchPosts}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading ? <ActivityIndicator size="small" color="#546F1C" style={{ marginVertical: 15 }} /> : null}
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
    paddingHorizontal: 12,
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
    height: 145,
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
    bottom: 50,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priceText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  cardFooter: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    marginBottom: 4,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 11,
    fontFamily: 'Nunito-Regular',
    flex: 1,
  },
  saveButton: {
    padding: 2,
  },
});