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
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { collection, query, orderBy, getDocs, limit, startAfter, where, documentId } from 'firebase/firestore';
import { db } from './config/firebase';
import { formatViews } from './config/formatViews';
import { auth } from './config/firebase';

export default function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' o 'users'
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

      const authorUids = [...new Set(querySnapshot.docs.map(d => d.data().autor).filter(Boolean))];
      const authorsMap = {};

      if (authorUids.length > 0) {
        for (let i = 0; i < authorUids.length; i += 10) {
          const chunk = authorUids.slice(i, i + 10);
          const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
          const usersSnap = await getDocs(usersQuery);
          usersSnap.forEach(uDoc => {
            const d = uDoc.data();
            authorsMap[uDoc.id] = {
              profileName: d.profileName || d.username || 'Usuario',
              username: d.username || 'usuario',
              profilePicture: d.profilePicture || '',
            };
          });
        }
      }

      const list = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const authorInfo = authorsMap[data.autor] || { profileName: 'Usuario', username: 'usuario', profilePicture: '' };
        return {
          id: doc.id,
          image: data.imagenes && data.imagenes.length > 0 ? data.imagenes[0] : 'https://picsum.photos/seed/placeholder/400/300',
          title: data.titulo || '',
          description: data.descripcion || '',
          price: data.precio ? `${data.precio}$` : null,
          views: formatViews(data.vistas || 0),
          author: data.autor,
          authorProfileName: authorInfo.profileName,
          authorUsername: authorInfo.username,
          authorProfilePicture: authorInfo.profilePicture,
        };
      });

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
  const fetchUsers = async () => {
      if (usersLoading) return;
      setUsersLoading(true);
      try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, limit(100));
          const snapshot = await getDocs(q);
          const currentUid = auth.currentUser?.uid;
          const usersList = snapshot.docs
              .map(doc => ({
                  id: doc.id,
                  uid: doc.id,
                  profileName: doc.data().profileName || doc.data().username || 'Usuario',
                  username: doc.data().username || 'usuario',
                  profilePicture: doc.data().profilePicture || '',
              }))
              .filter(user => user.uid !== currentUid);
          setUsers(usersList);
      } catch (error) {
          console.log("Error buscando usuarios:", error);
      } finally {
          setUsersLoading(false);
      }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setLastVisible(null);
    setHasMore(true);
    await Promise.all([fetchPosts(true), fetchUsers()]);
    setRefreshing(false);
  };

  const hasFetched = React.useRef(false);
  useEffect(() => {
      const unsubscribe = navigation.addListener('focus', () => {
        if (!hasFetched.current) {
          fetchPosts(true);
          fetchUsers();
          hasFetched.current = true;
        }
      });
      return unsubscribe;
  }, [navigation]);

  // Filtrado reactivo en memoria según el título escrito
  const filteredPosts = posts.filter(post => 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.authorProfileName && post.authorProfileName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (post.authorUsername && post.authorUsername.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredUsers = users.filter(user => 
      user.profileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
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
  const renderUser = ({ item }) => (
    <TouchableOpacity
        style={[styles.userCard, { backgroundColor: isDark ? '#1C1C1C' : '#F5F5F5' }]}
        onPress={() => {
            if (item.uid === auth.currentUser?.uid) {
                navigation.navigate('MainTabs', { screen: 'Profile' });
            } else {
                navigation.navigate('UserProfile', {
                    userId: item.uid,
                    profileName: item.profileName,
                    username: item.username,
                    profilePicture: item.profilePicture,
                });
            }
        }}
    >
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.userAvatar} />
        ) : (
          <View style={[styles.userAvatarFallback, { backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8' }]}>
            <Ionicons
              name="person-circle-outline"
              size={50}
              color="#94BA46"
            />
          </View>
        )}
        <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {item.profileName}
            </Text>
            <Text style={[styles.userHandle, { color: isDark ? '#888' : '#666' }]} numberOfLines={1}>
                @{item.username}
            </Text>
        </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
    >
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
            placeholder="Buscar publicaciones o usuarios..."
            placeholderTextColor={isDark ? '#AAA' : '#888'}
            style={[styles.input, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && { borderBottomColor: '#9DBD3F' }]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'posts' ? '#9DBD3F' : (isDark ? '#888' : '#666') }]}>
            Publicaciones
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && { borderBottomColor: '#9DBD3F' }]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'users' ? '#9DBD3F' : (isDark ? '#888' : '#666') }]}>
            Usuarios
          </Text>
        </TouchableOpacity>
      </View>

      {/* Resultados */}
      {activeTab === 'posts' ? (
        <FlatList
          key="posts-grid"
          data={filteredPosts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          onEndReached={() => fetchPosts(false)}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={7}
          initialNumToRender={18}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#546F1C']}
              tintColor="#546F1C"
            />
          }
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
      ) : (
        <FlatList
          key="users-list"
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#546F1C']}
              tintColor="#546F1C"
            />
          }
          ListFooterComponent={
            usersLoading ? (
              <ActivityIndicator
                size="large"
                color="#9DBD3F"
                style={{ marginVertical: 15 }}
              />
            ) : null
          }
          ListEmptyComponent={
            !usersLoading && filteredUsers.length === 0 ? (
              <Text style={[styles.emptyText, { color: isDark ? '#888' : '#666' }]}>
                No se encontraron usuarios
              </Text>
            ) : null
          }
        />
      )}
    </KeyboardAvoidingView>
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 10,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
  },
  userHandle: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
  },
  userAvatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});