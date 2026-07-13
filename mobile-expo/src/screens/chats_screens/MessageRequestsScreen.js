import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image,
  ActivityIndicator, Animated, PanResponder, Alert, TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { approveMessageRequest, rejectMessageRequest, cancelMessageRequest } from '../config/userActions';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';

const v1 = '#546F1C';
const v2 = '#9DBD3F';

export default function MessageRequestsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [activeTab, setActiveTab] = useState(0); 
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
  const [selectedApproved, setSelectedApproved] = useState(null);
  const confirmOpacity = useRef(new Animated.Value(0)).current;
  const confirmScale = useRef(new Animated.Value(0.9)).current;

  const caretAnims = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const switchTab = (index) => {
    setActiveTab(index);
    caretAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === index ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    });
  };

  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) =>
      Math.abs(gs.dx) > 20 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2,
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, gs) => {
      if (gs.dx > 50) switchTab(Math.max(0, activeTabRef.current - 1));
      else if (gs.dx < -50) switchTab(Math.min(2, activeTabRef.current + 1));
    },
  }), []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    
    const sentQuery = query(
      collection(db, 'messageRequests'),
      where('senderId', '==', user.uid)
    );
    const unsubSent = onSnapshot(sentQuery, async (snapshot) => {
      const requests = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data();
        const userDoc = await getDoc(doc(db, 'users', data.receiverId));
        const userData = userDoc.exists() ? userDoc.data() : {};
        return {
          id: d.id,
          userId: data.receiverId,
          name: userData.profileName || userData.username || 'Usuario',
          username: userData.username || '',
          profilePicture: userData.profilePicture || '',
          status: data.status,
          createdAt: data.createdAt,
        };
      }));
      setSentRequests(requests);
    });

    
    const receivedQuery = query(
      collection(db, 'messageRequests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubReceived = onSnapshot(receivedQuery, async (snapshot) => {
      const requests = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data();
        const userDoc = await getDoc(doc(db, 'users', data.senderId));
        const userData = userDoc.exists() ? userDoc.data() : {};
        return {
          id: d.id,
          userId: data.senderId,
          name: userData.profileName || userData.username || 'Usuario',
          username: userData.username || '',
          profilePicture: userData.profilePicture || '',
          status: data.status,
          createdAt: data.createdAt,
        };
      }));
      setReceivedRequests(requests);
      setLoading(false);
    });

    
    const approvedQuery = query(
      collection(db, 'messageRequests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'approved')
    );
    const unsubApproved = onSnapshot(approvedQuery, async (snapshot) => {
      const requests = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data();
        const userDoc = await getDoc(doc(db, 'users', data.senderId));
        const userData = userDoc.exists() ? userDoc.data() : {};
        return {
          id: d.id,
          userId: data.senderId,
          name: userData.profileName || userData.username || 'Usuario',
          username: userData.username || '',
          profilePicture: userData.profilePicture || '',
          status: data.status,
          createdAt: data.createdAt,
        };
      }));
      setApprovedRequests(requests);
    });

    return () => {
      unsubSent();
      unsubReceived();
      unsubApproved();
    };
  }, []);

  const handleApprove = async (item) => {
    try {
      await approveMessageRequest(item.id);
      
      const user = auth.currentUser;
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('participants', 'array-contains', user.uid));
      const snap = await getDocs(q);
      const existing = snap.docs.find(d => {
        const data = d.data();
        return data.participants?.includes(item.userId) && data.participants?.length === 2;
      });
      if (!existing) {
        await addDoc(chatsRef, {
          participants: [user.uid, item.userId],
          lastMessage: 'Solicitud de mensaje aprobada',
          lastMessageTime: serverTimestamp(),
          lastSender: user.uid,
          deletedBy: [],
        });
      }
    } catch (err) {
      console.log('Error approving request:', err);
    }
  };

  const handleReject = async (item) => {
    try {
      await rejectMessageRequest(item.id);
    } catch (err) {
      console.log('Error rejecting request:', err);
    }
  };

  const handleCancel = async (item) => {
    Alert.alert('Cancelar solicitud', '¿Querés cancelar esta solicitud de mensaje?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancelar solicitud',
        style: 'destructive',
        onPress: async () => {
          await cancelMessageRequest(item.id);
        },
      },
    ]);
  };

    const openRemoveConfirm = (item) => {
    setSelectedApproved(item);
    setConfirmRemoveVisible(true);
    confirmScale.setValue(0.9);
    Animated.parallel([
      Animated.timing(confirmOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(confirmScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
    ]).start();
  };

  const closeRemoveConfirm = () => {
    Animated.timing(confirmOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setConfirmRemoveVisible(false);
      setSelectedApproved(null);
    });
  };

  const handleRemovePermission = async () => {
    if (!selectedApproved) return;
    try {
      await deleteDoc(doc(db, 'messageRequests', selectedApproved.id));
      closeRemoveConfirm();
    } catch (err) {
      console.log('Error removing permission:', err);
      closeRemoveConfirm();
    }
  };

  const currentList = activeTab === 0 ? receivedRequests : activeTab === 1 ? sentRequests : approvedRequests;

  const renderItem = ({ item }) => {
    const isSent = activeTab === 1;
    const statusColors = {
      pending: '#FF9800',
      approved: '#4CAF50',
      rejected: '#E53935',
    };
    const statusLabels = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
    };

    return (
      <View style={[styles.requestRow, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]}>
        <TouchableOpacity
          style={styles.requestUserInfo}
          onPress={() => navigation.navigate('UserProfile', {
            userId: item.userId,
            profileName: item.name,
            username: item.username,
            profilePicture: item.profilePicture,
          })}
          activeOpacity={0.7}
        >
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={[styles.avatar, { borderColor: isDark ? '#2A2A2A' : '#E0E0E0' }]} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
              <Ionicons name="person-circle-outline" size={44} color="#94BA46" />
            </View>
          )}
          <View style={styles.userTextInfo}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.userUsername, { color: isDark ? '#888' : '#666' }]}>@{item.username}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.requestActions}>
          {activeTab === 0 ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
                onPress={() => handleApprove(item)}
              >
                <Text style={styles.actionBtnText}>Aprobar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#E53935' }]}
                onPress={() => handleReject(item)}
              >
                <Text style={styles.actionBtnText}>Rechazar</Text>
              </TouchableOpacity>
            </>
          ) : activeTab === 1 ? (
            <>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '22' }]}>
                <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                  {statusLabels[item.status]}
                </Text>
              </View>
              {item.status === 'pending' && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                  <Ionicons name="close-circle" size={22} color="#E53935" />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#E53935', flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => openRemoveConfirm(item)}
            >
              <Ionicons name="trash-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnText}>Quitar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {}
      <View style={[styles.header, { backgroundColor: isDark ? '#1C1C1C' : '#F5F5F5', paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Solicitudes de mensaje</Text>
      </View>

      {}
      <View style={styles.tabContainer}>
        {['Recibidos', 'Enviados', 'Aprobadas'].map((label, index) => {
          const isActive = activeTab === index;
          const textColor = caretAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)', '#9DBD3F'],
          });
          const caretOpacity = caretAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          });
          const caretTranslateY = caretAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [6, 0],
          });
          return (
            <TouchableOpacity
              key={label}
              style={styles.tab}
              activeOpacity={0.7}
              onPress={() => switchTab(index)}
            >
              <Animated.View style={{ alignItems: 'center', opacity: caretOpacity, transform: [{ translateY: caretTranslateY }], marginBottom: 2 }}>
                <Ionicons name="caret-down" size={22} color="#9DBD3F" />
              </Animated.View>
              <Animated.Text style={[styles.tabText, { color: textColor }]}>
                {label} {label === 'Recibidos' ? `(${receivedRequests.length})` : label === 'Enviados' ? `(${sentRequests.length})` : `(${approvedRequests.length})`}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {}
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {loading ? (
          <ActivityIndicator size="large" color={v1} style={{ marginTop: 50 }} />
        ) : currentList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={64} color={isDark ? '#444' : '#ccc'} />
            <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#666' }]}>
              {activeTab === 0
                ? 'No tenés solicitudes de mensaje recibidas'
                : activeTab === 1
                ? 'No tenés solicitudes de mensaje enviadas'
                : 'No tenés solicitudes aprobadas'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={currentList}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
                {}
        {confirmRemoveVisible && (
            <Animated.View style={[styles.confirmOverlay, { opacity: confirmOpacity }]}>
            <TouchableWithoutFeedback onPress={closeRemoveConfirm}>
                <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
            <Animated.View
                style={[
                styles.confirmCard,
                {
                    backgroundColor: isDark ? '#1C1C1C' : '#FFF',
                    borderColor: isDark ? '#2A2A2A' : '#E0E0E0',
                    transform: [{ scale: confirmScale }],
                },
                ]}
            >
                <View style={[styles.confirmIconCircle, { backgroundColor: isDark ? 'rgba(167,13,13,0.15)' : '#FBE9E9' }]}>
                <Ionicons name="trash" size={26} color="#a70d0d" />
                </View>
                <Text style={[styles.confirmTitle, { color: colors.text }]}>Quitar permiso de mensaje</Text>
                <Text style={[styles.confirmMessage, { color: isDark ? '#bbb' : '#555' }]}>
                ¿Querés quitarle el permiso de mensaje a {selectedApproved?.name}? Ya no podrá enviarte mensajes a menos que envíe una nueva solicitud.
                </Text>
                <View style={styles.confirmActions}>
                <TouchableOpacity
                    onPress={closeRemoveConfirm}
                    style={[styles.confirmBtn, { backgroundColor: isDark ? '#2C2C2C' : '#F2F2F2' }]}
                >
                    <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleRemovePermission}
                    style={[styles.confirmBtn, { backgroundColor: '#a70d0d' }]}
                >
                    <Ionicons name="trash" size={16} color="#FFF" />
                    <Text style={[styles.confirmBtnText, { color: '#FFF' }]}>Quitar</Text>
                </TouchableOpacity>
                </View>
            </Animated.View>
            </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontFamily: 'Nunito-Bold', marginLeft: 8 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 6, justifyContent: 'space-around' },
  tab: { flex: 1, alignItems: 'center' },
  tabText: { fontSize: 18, fontFamily: 'Nunito-Bold' },
  requestRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  requestUserInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, marginRight: 12 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userTextInfo: { flex: 1 },
  userName: { fontSize: 16, fontFamily: 'Nunito-Bold' },
  userUsername: { fontSize: 13, fontFamily: 'Nunito-Regular', marginTop: 2 },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  actionBtnText: { color: '#FFF', fontSize: 13, fontFamily: 'Nunito-Bold' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 13, fontFamily: 'Nunito-Bold' },
  cancelBtn: { padding: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontFamily: 'Nunito-Regular', textAlign: 'center', marginTop: 16, lineHeight: 22 },
  confirmOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmCard: { width: '82%', borderRadius: 20, borderWidth: 1, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  confirmIconCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  confirmTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', marginBottom: 8, textAlign: 'center' },
  confirmMessage: { fontSize: 14, fontFamily: 'Nunito-Regular', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  confirmActions: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 24 },
  confirmBtnText: { fontSize: 15, fontFamily: 'Nunito-Bold' },
});