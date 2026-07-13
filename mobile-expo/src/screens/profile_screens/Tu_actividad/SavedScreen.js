// src/screens/profile_screens/Tu_actividad/SavedScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Image, ActivityIndicator, Dimensions, Alert
} from 'react-native';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../config/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3;

export default function SavedScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedPosts = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'saved'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ docId: d.id, ...d.data() }));
      items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setPosts(items);
    } catch (e) {
      console.log('Error fetching saved posts:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchSavedPosts();
    setSelected([]);
  }, []));

  const toggleSelect = (docId) => {
    setSelected(prev =>
      prev.includes(docId) ? prev.filter(i => i !== docId) : [...prev, docId]
    );
  };

  const handleUnsave = () => {
    Alert.alert(
      'Quitar guardado',
      `¿Quitar ${selected.length} publicación${selected.length > 1 ? 'es' : ''} de Guardados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar', style: 'destructive',
          onPress: async () => {
            const removedDocs = [...selected];
            setPosts(prev => prev.filter(p => !removedDocs.includes(p.docId)));
            setSelected([]);
            try {
              await Promise.all(removedDocs.map(docId => deleteDoc(doc(db, 'saved', docId))));
            } catch (e) {
              console.log('Error removing saved:', e);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isSelected = selected.includes(item.docId);
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.itemSelected]}
        onPress={() => toggleSelect(item.docId)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.postImage }} style={styles.image} />
        {isSelected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={12} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? '#222' : '#E5E5E5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Guardados</Text>
        <Text style={[styles.count, { color: isDark ? '#888' : '#999' }]}>{posts.length}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#546F1C" style={{ marginTop: 60 }} />
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={56} color={isDark ? '#444' : '#CCC'} />
          <Text style={[styles.emptyText, { color: isDark ? '#555' : '#AAA' }]}>
            Todavía no guardaste ninguna publicación
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          numColumns={3}
          keyExtractor={item => item.docId}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
        />
      )}

      {selected.length > 0 && (
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.botonrojo }]} onPress={handleUnsave}>
          <Text style={styles.buttonText}>Quitar guardado ({selected.length})</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: { fontSize: 22, fontFamily: 'Nunito-Bold', flex: 1 },
  count: { fontSize: 14, fontFamily: 'Nunito-Regular' },
  grid: { padding: 12, gap: 6 },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  itemSelected: { opacity: 0.7 },
  image: { width: '100%', height: '100%' },
  checkBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#546F1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
    textAlign: 'center',
  },
  button: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});