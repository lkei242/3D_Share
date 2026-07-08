import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { followUser, unfollowUser, checkIfFollowing, getBlockedUids } from './config/userActions';

const { width } = Dimensions.get('window');
const PAGE_WIDTH = width;

export default function UserProfileContactsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const { userId, profileName } = route.params;

  const [activeTab, setActiveTab] = useState(0);
  const scrollViewRef = useRef(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [mutualFriends, setMutualFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingState, setFollowingState] = useState({});

  const currentUser = auth.currentUser;

  const fetchFollowers = useCallback(async () => {
    try {
      const blockedUids = await getBlockedUids(userId);
      const q = query(collection(db, 'followers'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const followerIds = snapshot.docs.map(d => d.data().followerId).filter(uid => !blockedUids.includes(uid));

      const data = [];
      for (const uid of followerIds) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const d = userDoc.data();
          data.push({
            id: uid,
            uid,
            name: d.profileName || d.username || 'Usuario',
            username: d.username || 'usuario',
            profilePicture: d.profilePicture || '',
          });
        }
      }
      setFollowers(data);
    } catch (error) {
      console.log('Error fetching followers:', error);
    }
  }, [userId]);

  const fetchFollowing = useCallback(async () => {
    try {
      const blockedUids = await getBlockedUids(userId);
      const q = query(collection(db, 'followers'), where('followerId', '==', userId));
      const snapshot = await getDocs(q);
      const followingIds = snapshot.docs.map(d => d.data().userId).filter(uid => !blockedUids.includes(uid));

      const data = [];
      for (const uid of followingIds) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const d = userDoc.data();
          data.push({
            id: uid,
            uid,
            name: d.profileName || d.username || 'Usuario',
            username: d.username || 'usuario',
            profilePicture: d.profilePicture || '',
          });
        }
      }
      setFollowing(data);
    } catch (error) {
      console.log('Error fetching following:', error);
    }
  }, [userId]);

  const fetchMutualFriends = useCallback(async () => {
    if (!currentUser) return;
    try {
      const myBlockedUids = await getBlockedUids(currentUser.uid);
      const theirBlockedUids = await getBlockedUids(userId);
      const allBlocked = [...new Set([...myBlockedUids, ...theirBlockedUids])];

      const myFollowingQ = query(collection(db, 'followers'), where('followerId', '==', currentUser.uid));
      const myFollowingSnap = await getDocs(myFollowingQ);
      const myFollowingIds = myFollowingSnap.docs.map(d => d.data().userId);

      const theirFollowingQ = query(collection(db, 'followers'), where('followerId', '==', userId));
      const theirFollowingSnap = await getDocs(theirFollowingQ);
      const theirFollowingIds = theirFollowingSnap.docs.map(d => d.data().userId);

      const mutualIds = myFollowingIds.filter(uid => theirFollowingIds.includes(uid) && !allBlocked.includes(uid));

      const data = [];
      for (const uid of mutualIds) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const d = userDoc.data();
          data.push({
            id: uid,
            uid,
            name: d.profileName || d.username || 'Usuario',
            username: d.username || 'usuario',
            profilePicture: d.profilePicture || '',
          });
        }
      }
      setMutualFriends(data);
    } catch (error) {
      console.log('Error fetching mutual friends:', error);
    }
  }, [currentUser?.uid, userId]);

  const checkFollowingState = useCallback(async (userList) => {
    if (!currentUser) return;
    const state = {};
    for (const user of userList) {
      if (user.uid !== currentUser.uid) {
        const isFollowing = await checkIfFollowing(currentUser.uid, user.uid);
        state[user.uid] = isFollowing;
      }
    }
    setFollowingState(state);
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    Promise.all([fetchFollowers(), fetchFollowing(), fetchMutualFriends()]).finally(() => {
      setLoading(false);
    });
  }, [fetchFollowers, fetchFollowing, fetchMutualFriends, currentUser]);

  useEffect(() => {
    const allUsers = [...followers, ...following, ...mutualFriends];
    checkFollowingState(allUsers);
  }, [followers, following, mutualFriends, checkFollowingState]);

    const handleContentSizeChange = useCallback((contentWidth) => {
      if (route.params?.initialTab && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: route.params.initialTab * PAGE_WIDTH, animated: false });
      }
    }, [route.params?.initialTab]);

  const handleFollowToggle = async (targetUid) => {
    const isCurrentlyFollowing = followingState[targetUid];
    setFollowingState(prev => ({ ...prev, [targetUid]: !isCurrentlyFollowing }));

    if (isCurrentlyFollowing) {
      const ok = await unfollowUser(currentUser.uid, targetUid);
      if (!ok) {
        setFollowingState(prev => ({ ...prev, [targetUid]: true }));
      } else {
        fetchMutualFriends();
      }
    } else {
      const ok = await followUser(currentUser.uid, targetUid);
      if (!ok) {
        setFollowingState(prev => ({ ...prev, [targetUid]: false }));
      } else {
        fetchMutualFriends();
      }
    }
  };

  const handleTabPress = (index) => {
    setActiveTab(index);
    scrollViewRef.current?.scrollTo({ x: index * PAGE_WIDTH, animated: true });
  };

  const handleScrollEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
    setActiveTab(index);
  };

  const getListData = (tabIndex) => {
    let data;
    if (tabIndex === 0) data = mutualFriends;
    else if (tabIndex === 1) data = followers;
    else data = following;

    if (searchQuery) {
      data = data.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return data;
  };

  const renderUserItem = ({ item }) => {
    const isMe = item.uid === currentUser?.uid;
    const isFollowingUser = followingState[item.uid];

    return (
      <TouchableOpacity
        style={[styles.userRow, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}
        onPress={() => {
          if (isMe) {
            navigation.goBack();
            navigation.navigate('MainTabs', { screen: 'Profile' });
          } else {
            navigation.goBack();
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
          <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8' }]}>
            <Ionicons name="person-circle-outline" size={50} color="#9ae800" />
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: isDark ? '#FFF' : '#000' }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.userHandle, { color: isDark ? '#888' : '#666' }]} numberOfLines={1}>
            @{item.username}
          </Text>
        </View>
        {!isMe && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.iconButton} onPress={() => {}}>
              <Ionicons name="chatbubbles-outline" size={20} color="#bdbdbd" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleFollowToggle(item.uid)}
            >
              <Ionicons
                name={isFollowingUser ? 'person-remove-outline' : 'person-add-outline'}
                size={22}
                color={isFollowingUser ? '#E53935' : '#9DBD3F'}
              />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#FFF', paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {profileName}
        </Text>
      </View>

      {/* Stats Tabs */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statTab} onPress={() => handleTabPress(0)}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{mutualFriends.length}</Text>
          <Text style={[styles.statLabel, { color: isDark ? '#888' : '#666' }]}> en común</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statTab} onPress={() => handleTabPress(1)}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{followers.length}</Text>
          <Text style={[styles.statLabel, { color: isDark ? '#888' : '#666' }]}> seguidores</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statTab} onPress={() => handleTabPress(2)}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{following.length}</Text>
          <Text style={[styles.statLabel, { color: isDark ? '#888' : '#666' }]}> seguidos</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0' }]}>
        <Ionicons name="search" size={20} color={isDark ? '#666' : '#999'} />
        <TextInput
          placeholder="Buscar"
          placeholderTextColor={isDark ? '#666' : '#999'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color="#546F1C" style={{ marginTop: 40 }} />
      ) : (
         <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          onContentSizeChange={handleContentSizeChange}
          style={styles.scrollView}
        >
          {[0, 1, 2].map((tabIndex) => (
            <View key={tabIndex} style={{ width: PAGE_WIDTH }}>
              <FlatList
                data={getListData(tabIndex)}
                keyExtractor={(item) => item.id}
                renderItem={renderUserItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: isDark ? '#666' : '#999' }]}>
                      {tabIndex === 0 ? 'No hay amigos en común' :
                       tabIndex === 1 ? 'No hay seguidores' : 'No hay seguidos'}
                    </Text>
                  </View>
                }
              />
            </View>
          ))}
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    marginLeft: 16,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 24,
  },
  statTab: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
  },
  statLabel: {
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
  },
  userHandle: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    marginTop: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
  },
});