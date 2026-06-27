// src/screens/profile_screens/ContactsScreen.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dimensions,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const PAGE_WIDTH = width - 40;

// Paleta de Colores
const COLORS = {
  GREEN_PRIMARY: '#546F1C',
  GREEN_ACCENT: '#9DBD3F',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  BLACK_DARK: '#0B0B0B',
  GRAY_900: '#1F1F1F',
  GRAY_850: '#2C2C2C',
  GRAY_800: '#333333',
  GRAY_600: '#666666',
  GRAY_500: '#888888',
  GRAY_400: '#999999',
  GRAY_350: '#AAAAAA',
  GRAY_300: '#CCCCCC',
  GRAY_200: '#E0E0E0',
  GRAY_100: '#F0F0F0',
  GRAY_50: '#F5F5F5',
};

export default function ContactsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.dark || colors.text === '#FFFFFF';
  
  const [activeTab, setActiveTab] = useState(route.params?.initialTab ?? 0);
  const scrollViewRef = useRef(null);
  useEffect(() => {
    if (route.params?.initialTab === 1) {
      const timer = setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ x: PAGE_WIDTH, animated: false });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para la búsqueda
  const [searchFollowers, setSearchFollowers] = useState('');
  const [searchFollowing, setSearchFollowing] = useState('');
  
  const currentUser = auth.currentUser;

  // Filtrar datos según la búsqueda
  const filteredFollowers = followers.filter(user =>
    user.name.toLowerCase().includes(searchFollowers.toLowerCase()) ||
    user.username.toLowerCase().includes(searchFollowers.toLowerCase())
  );

  const filteredFollowing = following.filter(user =>
    user.name.toLowerCase().includes(searchFollowing.toLowerCase()) ||
    user.username.toLowerCase().includes(searchFollowing.toLowerCase())
  );

  // Obtener lista de seguidos
  const fetchFollowing = useCallback(async () => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'followers'), where('followerId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      const followingIds = snapshot.docs.map(doc => doc.data().userId);

      const followingData = [];
      for (const uid of followingIds) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          followingData.push({
            id: uid,
            uid: uid,
            name: data.profileName || data.username || 'Usuario',
            username: data.username || 'usuario',
            profilePicture: data.profilePicture || '',
          });
        }
      }
      setFollowing(followingData);
    } catch (error) {
      console.log('Error fetching following:', error);
    }
  }, [currentUser]);

  // Obtener lista de seguidores
  const fetchFollowers = useCallback(async () => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'followers'), where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      const followerIds = snapshot.docs.map(doc => doc.data().followerId);

      const followersData = [];
      for (const uid of followerIds) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          followersData.push({
            id: uid,
            uid: uid,
            name: data.profileName || data.username || 'Usuario',
            username: data.username || 'usuario',
            profilePicture: data.profilePicture || '',
          });
        }
      }
      setFollowers(followersData);
    } catch (error) {
      console.log('Error fetching followers:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchFollowing(), fetchFollowers()]).finally(() => setLoading(false));
  }, [fetchFollowing, fetchFollowers]);

  const handleTabPress = (index) => {
    setActiveTab(index);
    scrollViewRef.current?.scrollTo({ x: index * PAGE_WIDTH, animated: true });
  };

  const handleScrollEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
    setActiveTab(index);
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.userRow,
        {
          backgroundColor: isDark ? COLORS.GRAY_900 : COLORS.WHITE,
        }
      ]}
      onPress={() => {
        if (item.uid === currentUser?.uid) {
          navigation.navigate('MainTabs', { screen: 'Profile' });
        } else {
          navigation.navigate('UserProfile', {
            userId: item.uid,
            profileName: item.name,
            username: item.username,
            profilePicture: item.profilePicture,
          });
        }
      }}
    >
      {item.profilePicture ? (
        <Image source={{ uri: item.profilePicture }} style={styles.avatarImage} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8' }]}>
          <Ionicons
            name="person-circle-outline"
            size={50}
            color="#94BA46"
          />
        </View>
      )}
      <View style={styles.userInfo}>
        <Text
          style={[styles.userName, { color: isDark ? COLORS.WHITE : COLORS.BLACK }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          style={[styles.userHandle, { color: isDark ? COLORS.GRAY_400 : COLORS.GRAY_600 }]}
          numberOfLines={1}
        >
          @{item.username}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDark ? COLORS.GRAY_600 : COLORS.GRAY_300} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? COLORS.BLACK_DARK : COLORS.WHITE, paddingTop: insets.top + 10 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? COLORS.GRAY_900 : COLORS.GRAY_50 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? COLORS.WHITE : COLORS.BLACK} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? COLORS.WHITE : COLORS.BLACK }]}>Contactos</Text>
      </View>

      {/* Estadísticas */}
      <View style={[styles.statsContainer, { backgroundColor: isDark ? COLORS.GRAY_900 : COLORS.GRAY_50 }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: isDark ? COLORS.WHITE : COLORS.BLACK }]}>{followers.length}</Text>
          <Text style={[styles.statLabel, { color: isDark ? COLORS.GRAY_400 : COLORS.GRAY_600 }]}>Seguidores</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: isDark ? COLORS.GRAY_800 : COLORS.GRAY_200 }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: isDark ? COLORS.WHITE : COLORS.BLACK }]}>{following.length}</Text>
          <Text style={[styles.statLabel, { color: isDark ? COLORS.GRAY_400 : COLORS.GRAY_600 }]}>Seguidos</Text>
        </View>
      </View>

      {/* Indicador de Pestañas (Tabs) */}
      <View style={[styles.tabContainer, { backgroundColor: isDark ? COLORS.GRAY_900 : COLORS.GRAY_100 }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 0 && styles.activeTab]}
          onPress={() => handleTabPress(0)}
        >
          <Text style={[styles.tabText, { color: activeTab === 0 ? COLORS.WHITE : (isDark ? COLORS.GRAY_400 : COLORS.GRAY_600) }]}>
            Seguidores
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 1 && styles.activeTab]}
          onPress={() => handleTabPress(1)}
        >
          <Text style={[styles.tabText, { color: activeTab === 1 ? COLORS.WHITE : (isDark ? COLORS.GRAY_400 : COLORS.GRAY_600) }]}>
            Seguidos
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.GREEN_PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          onContentSizeChange={() => {
            if (route.params?.initialTab === 1 && scrollViewRef.current) {
              scrollViewRef.current.scrollTo({ x: PAGE_WIDTH, animated: false });
            }
          }}
          style={styles.scrollView}
        >
          {/* Página 1: Seguidores */}
          <View style={{ width: PAGE_WIDTH }}>
            <View style={[styles.searchContainer, { backgroundColor: isDark ? COLORS.GRAY_900 : COLORS.GRAY_50 }]}>
              <Ionicons name="search" size={20} color={isDark ? COLORS.GRAY_500 : COLORS.GRAY_400} style={styles.searchIcon} />
              <TextInput
                placeholder="Buscar seguidores..."
                placeholderTextColor={isDark ? COLORS.GRAY_600 : COLORS.GRAY_400}
                value={searchFollowers}
                onChangeText={setSearchFollowers}
                style={[styles.searchInput, { color: isDark ? COLORS.WHITE : COLORS.BLACK }]}
              />
            </View>
            <FlatList
              data={filteredFollowers}
              keyExtractor={(item) => item.id}
              renderItem={renderUserItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={isDark ? COLORS.GRAY_600 : COLORS.GRAY_300} />
                  <Text style={[styles.emptyText, { color: isDark ? COLORS.GRAY_500 : COLORS.GRAY_400, marginTop: 16 }]}>
                    No tenés seguidores aún
                  </Text>
                </View>
              }
            />
          </View>

          {/* Página 2: Seguidos */}
          <View style={{ width: PAGE_WIDTH }}>
            <View style={[styles.searchContainer, { backgroundColor: isDark ? COLORS.GRAY_900 : COLORS.GRAY_50 }]}>
              <Ionicons name="search" size={20} color={isDark ? COLORS.GRAY_500 : COLORS.GRAY_400} style={styles.searchIcon} />
              <TextInput
                placeholder="Buscar seguidos..."
                placeholderTextColor={isDark ? COLORS.GRAY_600 : COLORS.GRAY_400}
                value={searchFollowing}
                onChangeText={setSearchFollowing}
                style={[styles.searchInput, { color: isDark ? COLORS.WHITE : COLORS.BLACK }]}
              />
            </View>
            <FlatList
              data={filteredFollowing}
              keyExtractor={(item) => item.id}
              renderItem={renderUserItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={isDark ? COLORS.GRAY_600 : COLORS.GRAY_300} />
                  <Text style={[styles.emptyText, { color: isDark ? COLORS.GRAY_500 : COLORS.GRAY_400, marginTop: 16 }]}>
                    No seguís a nadie aún
                  </Text>
                </View>
              }
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginLeft: 16,
    letterSpacing: -0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.GREEN_PRIMARY,
    shadowColor: COLORS.GREEN_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 40,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: '#F0F0F0',
  },
  avatarText: {
    color: COLORS.WHITE,
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userHandle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
});