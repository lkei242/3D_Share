import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  Keyboard,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { height: screenH } = Dimensions.get('window');
import { auth, db } from '../config/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

export default function CommentModal({ visible, post, onClose, isDark, colors }) {
  const insets = useSafeAreaInsets();
  const currentUser = auth.currentUser;
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      fetchComments();
    } else {
      setText('');
      setKeyboardHeight(0);
    }

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [visible, post?.id]);

  const fetchComments = async () => {
    if (!post) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'comments'),
        where('postId', '==', post.id),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      setComments(snapshot.docs.map((d) => ({ docId: d.id, ...d.data() })));
    } catch (e) {
      console.log('Error fetching comments:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !post || sending) return;
    setSending(true);
    try {
      const name = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'usuario';
      await addDoc(collection(db, 'comments'), {
        userId: currentUser.uid,
        postId: post.id,
        postImage: post.image,
        postTitle: post.title,
        text: text.trim(),
        userDisplayName: name,
        createdAt: serverTimestamp(),
      });
      setText('');
      Keyboard.dismiss();
      await fetchComments();
    } catch (e) {
      console.log(e);
    } finally {
      setSending(false);
    }
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentRow}>
      <View style={[styles.avatarSmall, { borderColor: colors.avatarborder || '#ccc' }]}>
        <Image source={require('../../../assets/logo.png')} style={styles.avatarImageSmall} />
      </View>
      <View style={styles.commentContent}>
        <Text style={[styles.commentUser, { color: colors.text }]}>
          @{item.userDisplayName || 'usuario'}
        </Text>
        <Text style={[styles.commentText, { color: isDark ? '#bbb' : '#444' }]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.panel, { backgroundColor: colors.background, paddingBottom: keyboardHeight }]}>
          <View style={styles.handleBar} />
          <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#ddd' }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              Comentarios ({comments.length})
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#9DBD3F" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.docId}
              renderItem={renderComment}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: isDark ? '#555' : '#bbb' }]}>
                  Sé el primero en comentar
                </Text>
              }
              keyboardShouldPersistTaps="handled"
            />
          )}

          <View
            style={[
              styles.inputRow,
              {
                borderTopColor: isDark ? '#333' : '#ddd',
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 8,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#2C2C2C' : '#f0f0f0',
                  color: colors.text,
                },
              ]}
              placeholder="Escribe un comentario..."
              placeholderTextColor={isDark ? '#888' : '#999'}
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={[styles.sendBtn, { opacity: text.trim() && !sending ? 1 : 0.4 }]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#9DBD3F" />
              ) : (
                <Ionicons name="send" size={22} color="#9DBD3F" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  panel: {
    height: screenH * 0.85,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 10,
  },
  avatarImageSmall: {
    width: '100%',
    height: '100%',
  },
  commentContent: {
    flex: 1,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentText: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 18,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 60,
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
  },
  sendBtn: {
    marginLeft: 8,
    padding: 6,
  },
});
