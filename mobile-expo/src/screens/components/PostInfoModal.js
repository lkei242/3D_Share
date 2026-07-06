import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const TABS = ['Me gusta', 'Guardado', 'Visto'];
const COLLECTION_MAP = { 'Me gusta': 'likes', 'Guardado': 'saved', 'Visto': 'views' };

export default function PostInfoModal({ visible, onClose, postId }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';
  const [tab, setTab] = useState(TABS[0]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !postId) return;
    (async () => {
      setLoading(true);
      setUsers([]);
      try {
        const col = COLLECTION_MAP[tab];
        const snap = await getDocs(query(collection(db, col), where('postId', '==', postId), limit(50)));
        const userIds = [...new Set(snap.docs.map(d => d.data().userId).filter(Boolean))];
        if (!userIds.length) { setUsers([]); return; }
        const userDocs = (await Promise.all(userIds.map(uid => getDocs(query(collection(db, 'users'), where('__name__', '==', uid))))))
          .map(s => { const d = s.docs[0]; return d ? { uid: d.id, ...d.data() } : null; })
          .filter(Boolean);
        setUsers(userDocs);
      } catch (e) { console.log(e); }
      setLoading(false);
    })();
  }, [visible, postId, tab]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={onClose}>
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}>
            <Text style={[styles.title, { color: colors.text }]}>Info sobre este post</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          </View>
          <View style={[styles.tabRow, { borderBottomColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}>
            {TABS.map(t => (
              <TouchableOpacity key={t} style={[styles.tab, tab === t && { borderBottomColor: '#94BA46', borderBottomWidth: 2 }]} onPress={() => setTab(t)}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: tab === t ? '#94BA46' : (isDark ? '#888' : '#999') }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {loading ? <ActivityIndicator size="large" color="#94BA46" style={{ marginVertical: 40 }} /> :
            users.length === 0 ?
              <View style={{ alignItems: 'center', marginVertical: 60 }}><Ionicons name="people-outline" size={40} color={isDark ? '#555' : '#ccc'} /><Text style={{ color: isDark ? '#888' : '#999', marginTop: 12, fontSize: 15 }}>No hay usuarios aún</Text></View> :
              <FlatList data={users} keyExtractor={item => item.uid} renderItem={({ item }) => (
                <View style={styles.userRow}>
                  {item.profilePicture ? <Image source={{ uri: item.profilePicture }} style={styles.avatar} /> :
                    <View style={[styles.avatar, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="person" size={20} color="#94BA46" />
                    </View>}
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.profileName || 'Usuario'}</Text>
                    <Text style={[styles.handle, { color: isDark ? '#888' : '#666' }]} numberOfLines={1}>@{item.username || 'usuario'}</Text>
                  </View>
                </View>
              )} contentContainerStyle={{ paddingVertical: 8 }} />}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  content: { width: width * 0.9, maxHeight: '70%', borderRadius: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  name: { fontSize: 14, fontWeight: '600' },
  handle: { fontSize: 12 },
});
