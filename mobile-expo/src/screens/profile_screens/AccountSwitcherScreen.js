// src/screens/profile_screens/AccountSwitcherScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithGoogle } from '../config/googleSignIn';

export default function AccountSwitcherScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [storedAccounts, setStoredAccounts] = useState([]);

  // --- Multi-select state ---
  const [selectMode, setSelectMode] = useState(false);
  const [selectedUids, setSelectedUids] = useState([]);

  const currentUser = auth.currentUser;

  const loadStoredAccounts = async () => {
    try {
      const raw = await AsyncStorage.getItem('stored_accounts');
      if (raw) setStoredAccounts(JSON.parse(raw));
    } catch (e) {
      console.log('Error loading stored accounts:', e);
    }
  };

  const saveCurrentAccount = async (userDataMap) => {
    try {
      const raw = await AsyncStorage.getItem('stored_accounts');
      let accounts = raw ? JSON.parse(raw) : [];
      const exists = accounts.some((a) => a.uid === currentUser.uid);
      if (!exists) {
        accounts.push({
          uid: currentUser.uid,
          profileName: userDataMap?.profileName || 'Usuario',
          username: userDataMap?.username || 'usuario',
          email: currentUser.email,
          profilePicture: userDataMap?.profilePicture || null,
        });
      } else {
        accounts = accounts.map((a) =>
          a.uid === currentUser.uid
            ? { ...a, profileName: userDataMap?.profileName, username: userDataMap?.username, profilePicture: userDataMap?.profilePicture }
            : a
        );
      }
      await AsyncStorage.setItem('stored_accounts', JSON.stringify(accounts));
      setStoredAccounts(accounts);
    } catch (e) {
      console.log('Error saving account:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        if (!currentUser) { setLoading(false); return; }
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          let dataMap = null;
          if (userDoc.exists()) {
            dataMap = userDoc.data();
            setUserData(dataMap);
          }

          const postsQ = query(collection(db, 'posts'), where('autor', '==', currentUser.uid));
          const postsSnap = await getDocs(postsQ);

          const followersQ = query(collection(db, 'followers'), where('userId', '==', currentUser.uid));
          const followersSnap = await getDocs(followersQ);

          const followingQ = query(collection(db, 'followers'), where('followerId', '==', currentUser.uid));
          const followingSnap = await getDocs(followingQ);

          setStats({
            posts: postsSnap.size,
            followers: followersSnap.size,
            following: followingSnap.size,
          });

          await saveCurrentAccount(dataMap);
          await loadStoredAccounts();
        } catch (error) {
          console.log('Error fetching account data:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [])
  );

  const handleAddAccount = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.log('Error al cerrar sesión:', error);
    }
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleSwitchAccount = (account) => {
    if (currentUser && account.uid === currentUser.uid) return;
    Alert.alert(
      'Cambiar cuenta',
      `¿Querés cambiar a @${account.username}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar',
          onPress: async () => {
            try {
              await signOut(auth);
              if (account.password) {
                await signInWithEmailAndPassword(auth, account.email, account.password);
                navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
              } else {
                // Es cuenta de Google → usar Google Sign-In
                signInWithGoogle(
                  () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }),
                  (msg) => {
                    Alert.alert('Error', msg);
                    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
                  }
                );
              }
            } catch (error) {
              console.log('Error al cambiar cuenta:', error);
              if (!account.password) {
                signInWithGoogle(
                  () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }),
                  () => navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] })
                );
              } else {
                navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
              }
            }
          },
        },
      ]
    );
  };

  // Entra en modo selección y selecciona la cuenta presionada
  const handleLongPress = (account) => {
    setSelectMode(true);
    setSelectedUids([account.uid]);
  };

  // Tap en modo selección: toggle del uid
  const handleSelectToggle = (account) => {
    setSelectedUids((prev) => {
      const next = prev.includes(account.uid)
        ? prev.filter((uid) => uid !== account.uid)
        : [...prev, account.uid];
      if (next.length === 0) {
        setSelectMode(false);
      }
      return next;
    });
  };

  const handleCancelSelect = () => {
    setSelectMode(false);
    setSelectedUids([]);
  };

  const handleDeleteSelected = () => {
    if (selectedUids.length === 0) return;
    const deletingCurrentAccount = selectedUids.includes(currentUser?.uid);
    const count = selectedUids.length;
    const mensaje = deletingCurrentAccount
      ? `Vas a eliminar ${count} cuenta${count > 1 ? 's' : ''}. Como eliminás la cuenta activa, se cerrará sesión.`
      : `¿Querés eliminar ${count} cuenta${count > 1 ? 's' : ''} guardada${count > 1 ? 's' : ''}?`;

    Alert.alert('Eliminar cuentas', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = storedAccounts.filter((a) => !selectedUids.includes(a.uid));
            await AsyncStorage.setItem('stored_accounts', JSON.stringify(updated));
            if (deletingCurrentAccount) {
              await signOut(auth);
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            } else {
              setStoredAccounts(updated);
              setSelectMode(false);
              setSelectedUids([]);
            }
          } catch (e) {
            console.log('Error removing accounts:', e);
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Querés cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            } catch (error) {
              console.log('Error al cerrar sesión:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#222' : '#E5E5E5' }]}>
        <TouchableOpacity onPress={selectMode ? handleCancelSelect : () => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textnegrita }]}>
          {selectMode ? `${selectedUids.length} seleccionada${selectedUids.length !== 1 ? 's' : ''}` : 'Cambiar cuenta'}
        </Text>
        {/* Botón eliminar en modo selección */}
        {selectMode ? (
          <TouchableOpacity onPress={handleDeleteSelected} disabled={selectedUids.length === 0}>
            <Ionicons
              name="trash-outline"
              size={24}
              color={selectedUids.length > 0 ? '#E74C3C' : isDark ? '#444' : '#CCC'}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#546F1C" style={{ flex: 1 }} />
      ) : (
        <>
          {/* Perfil actual */}
          <View style={styles.profileSection}>
            {userData?.profilePicture ? (
              <Image
                source={{ uri: userData.profilePicture }}
                style={[styles.avatar, { borderColor: colors.avatarborder }]}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { borderColor: colors.avatarborder, backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                <Ionicons name="person-circle-outline" size={84} color="#94BA46" />
              </View>
            )}
            <Text style={[styles.profileName, { color: colors.textnegrita }]}>
              {userData?.profileName || 'Usuario'}
            </Text>
            <Text style={[styles.username, { color: isDark ? '#888' : '#666' }]}>
              @{userData?.username || 'usuario'}
            </Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.posts}</Text>
                <Text style={[styles.statLabel, { color: isDark ? '#888' : '#666' }]}>Publicaciones</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.followers}</Text>
                <Text style={[styles.statLabel, { color: isDark ? '#888' : '#666' }]}>Seguidores</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.following}</Text>
                <Text style={[styles.statLabel, { color: isDark ? '#888' : '#666' }]}>Seguidos</Text>
              </View>
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: isDark ? '#222' : '#E5E5E5' }]} />

          {/* Cuentas */}
          <View style={styles.accountsSection}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#888' : '#666' }]}>Cuentas</Text>

            {storedAccounts.map((account) => {
              const isCurrent = account.uid === currentUser?.uid;
              const isSelected = selectedUids.includes(account.uid);
              return (
                <TouchableOpacity
                  key={account.uid}
                  style={[
                    styles.accountCard,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? '#2A1A1A' : '#FDECEA')
                        : (isDark ? '#1C1C1C' : '#F5F5F5'),
                      borderColor: isSelected
                        ? '#E74C3C'
                        : (isDark ? '#333' : '#E0E0E0'),
                    },
                  ]}
                  onPress={() => {
                    if (selectMode) {
                      handleSelectToggle(account);
                    } else if (!isCurrent) {
                      handleSwitchAccount(account);
                    }
                  }}
                  onLongPress={() => handleLongPress(account)}
                  delayLongPress={350}
                  activeOpacity={!selectMode && isCurrent ? 1 : 0.7}
                >
                  <View style={styles.accountInfo}>
                    {account.profilePicture ? (
                      <Image source={{ uri: account.profilePicture }} style={styles.accountAvatar} />
                    ) : (
                      <View style={[styles.accountAvatar, styles.accountAvatarFallback, { backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8' }]}>
                        <Ionicons name="person-circle-outline" size={36} color="#94BA46" />
                      </View>
                    )}
                    <View style={styles.accountTextContainer}>
                      <Text style={[styles.accountName, { color: colors.text }]}>
                        {isCurrent ? (userData?.profileName || 'Usuario') : account.profileName}
                      </Text>
                      <Text style={[styles.accountHandle, { color: isDark ? '#888' : '#666' }]}>
                        @{isCurrent ? (userData?.username || 'usuario') : account.username}
                      </Text>
                    </View>
                  </View>
                  {selectMode ? (
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={isSelected ? '#E74C3C' : (isDark ? '#555' : '#BBB')}
                    />
                  ) : isCurrent ? (
                    <Ionicons name="checkmark-circle" size={24} color="#9DBD3F" />
                  ) : (
                    <Ionicons name="swap-horizontal" size={20} color={isDark ? '#888' : '#666'} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Agregar cuenta — oculto en modo selección */}
            {!selectMode && (
              <TouchableOpacity
                style={[styles.accountButton, { backgroundColor: colors.card, borderColor: isDark ? '#333' : '#E0E0E0' }]}
                onPress={handleAddAccount}
              >
                <View style={[styles.accountIconCircle, { backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8' }]}>
                  <Ionicons name="person-add-outline" size={20} color="#9DBD3F" />
                </View>
                <Text style={[styles.accountButtonText, { color: colors.text }]}>Agregar cuenta</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cerrar sesión — oculto en modo selección */}
          {!selectMode && (
            <View style={styles.logoutSection}>
              <TouchableOpacity
                style={[styles.logoutButton, { backgroundColor: colors.botonrojo }]}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.logoutText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
    justifyContent: 'space-between',
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginRight: 25,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  separator: {
    height: 1,
    marginHorizontal: 20,
  },
  accountsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 10,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  accountAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountTextContainer: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
  },
  accountHandle: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    marginTop: 1,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  accountIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountButtonText: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  logoutText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
  },
});