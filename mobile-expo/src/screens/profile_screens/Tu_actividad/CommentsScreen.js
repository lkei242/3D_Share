// src/screens/profile_screens/Tu_actividad/CommentsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';

export default function CommentsScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [comments, setComments] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'comments'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);

      // Para cada comentario, intentamos traer la imagen del post asociado
      const items = await Promise.all(
        snapshot.docs.map(async (d) => {
          const data = { docId: d.id, ...d.data() };
          // Intentar obtener imagen del post si no viene en el comentario
          if (!data.postImage && data.postId) {
            try {
              const postSnap = await getDoc(doc(db, 'posts', data.postId));
              if (postSnap.exists()) {
                const postData = postSnap.data();
                data.postImage =
                  postData.imagenes?.[0] || null;
                data.postTitle = postData.titulo || data.postTitle || '';
              }
            } catch (_) { }
          }
          return data;
        })
      );

      // Ordenar por fecha descendente
      items.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
      );
      setComments(items);
    } catch (e) {
      console.log('Error fetching comments:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchComments();
      setSelected([]);
    }, [])
  );

  const toggleSelect = (docId) => {
    setSelected((prev) =>
      prev.includes(docId) ? prev.filter((i) => i !== docId) : [...prev, docId]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar comentarios',
      `¿Eliminar ${selected.length} comentario${selected.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                selected.map((docId) =>
                  deleteDoc(doc(db, 'comments', docId))
                )
              );
              setComments((prev) =>
                prev.filter((c) => !selected.includes(c.docId))
              );
              setSelected([]);
            } catch (e) {
              console.log('Error deleting comments:', e);
            }
          },
        },
      ]
    );
  };

  // Agrupar comentarios por postId para mostrarlos como en la versión original
  const groupedByPost = comments.reduce((acc, comment) => {
    const key = comment.postId || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        postId: key,
        postImage: comment.postImage || null,
        postTitle: comment.postTitle || 'Publicación',
        comments: [],
      };
    }
    acc[key].comments.push(comment);
    return acc;
  }, {});

  const groupedList = Object.values(groupedByPost);

  const renderGroup = ({ item: group }) => (
    <View style={styles.postContainer}>
      <View style={styles.postRow}>
        {/* Thumbnail del post */}
        <View
          style={[
            styles.thumbnail,
            { backgroundColor: isDark ? '#2C2C2C' : '#E8E8E8' },
          ]}
        >
          {group.postImage ? (
            <Image
              source={{ uri: group.postImage }}
              style={styles.thumbnailImage}
            />
          ) : (
            <Ionicons
              name="image-outline"
              size={28}
              color={isDark ? '#555' : '#BBB'}
            />
          )}
        </View>

        {/* Comentarios del post */}
        <View style={styles.info}>
          <Text
            style={[styles.caption, { color: colors.text }]}
            numberOfLines={1}
          >
            {group.postTitle}
          </Text>

          {group.comments.map((comment) => {
            const isSelected = selected.includes(comment.docId);
            return (
              <TouchableOpacity
                key={comment.docId}
                style={[
                  styles.commentRow,
                  isSelected && {
                    backgroundColor: isDark
                      ? 'rgba(148,186,70,0.12)'
                      : 'rgba(148,186,70,0.08)',
                    borderRadius: 6,
                    paddingHorizontal: 6,
                  },
                ]}
                onPress={() => toggleSelect(comment.docId)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.commentText,
                    { color: isDark ? '#DDD' : '#555', flex: 1 },
                  ]}
                  numberOfLines={2}
                >
                  {comment.text}
                </Text>

                {isSelected && (
                  <Ionicons name="checkbox" size={22} color="#94BA46" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Separador */}
      <View
        style={[
          styles.separator,
          { backgroundColor: isDark ? '#2A2A2A' : '#ECECEC' },
        ]}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Comentarios</Text>
        <Text style={[styles.count, { color: isDark ? '#888' : '#999' }]}>
          {comments.length}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#546F1C"
          style={{ marginTop: 60 }}
        />
      ) : comments.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="chatbubble-outline"
            size={56}
            color={isDark ? '#444' : '#CCC'}
          />
          <Text
            style={[
              styles.emptyText,
              { color: isDark ? '#555' : '#AAA' },
            ]}
          >
            Todavía no hiciste ningún comentario
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedList}
          keyExtractor={(item) => item.postId}
          renderItem={renderGroup}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {selected.length > 0 && (
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: colors.botonrojo }]}
          onPress={handleDelete}
        >
          <Text style={styles.deleteText}>
            Eliminar ({selected.length})
          </Text>
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
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Nunito-Bold',
    flex: 1,
  },
  count: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  postContainer: {
    marginHorizontal: 16,
    marginBottom: 4,
  },
  postRow: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  caption: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    marginBottom: 8,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingVertical: 3,
  },
  commentText: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    lineHeight: 18,
  },
  separator: {
    height: 1,
    marginTop: 4,
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
  deleteButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  deleteText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});