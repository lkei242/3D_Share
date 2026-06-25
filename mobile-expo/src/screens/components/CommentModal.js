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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

const { height: screenH } = Dimensions.get('window');

export default function CommentModal({ visible, post, onClose, isDark, colors }) {
    const insets = useSafeAreaInsets();
    const currentUser = auth.currentUser;
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const inputRef = useRef(null);

    const panY = useRef(new Animated.Value(screenH)).current;
    const gestureStartY = useRef(0);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const FULL_Y = -screenH * 0.9;
    const NORMAL_Y = 0;
    const CLOSE_Y = screenH;
    

  useEffect(() => {
    if (visible) {
      Animated.spring(panY, {
        toValue: NORMAL_Y,
        useNativeDriver: true,
        damping: 22,
        stiffness: 180,
      }).start();
      fetchComments();
      
    } else {
      panY.setValue(CLOSE_Y);
    }
  }, [visible, post?.id]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        const isVertical = Math.abs(gs.dy) > Math.abs(gs.dx);
        // 🔥 CLAVE: Solo permitir deslizar hacia abajo (gs.dy > 0) y mayor al umbral
        const isDownward = gs.dy > 6;
        return isVertical && isDownward;
      },
      onPanResponderGrant: () => {
        gestureStartY.current = panY._value || NORMAL_Y;
      },
      onPanResponderMove: (evt, gs) => {
                const newY = gestureStartY.current + gs.dy;
                // Doble seguridad: Math.max evita que suba por encima de NORMAL_Y
                panY.setValue(Math.max(NORMAL_Y, Math.min(CLOSE_Y, newY)));
            },
            onPanResponderRelease: (evt, gs) => {
        const currentY = panY._value || NORMAL_Y;
        const velocity = gs.vy;

        if (currentY > NORMAL_Y + 60 || velocity > 0.8) {
            Animated.timing(panY, {
            toValue: CLOSE_Y,
            duration: 250,
            useNativeDriver: true,
            }).start(() => onCloseRef.current());
            return;
        }

        Animated.spring(panY, {
            toValue: NORMAL_Y,
            useNativeDriver: true,
            damping: 22,
            stiffness: 180,
        }).start();
        },
    })
  ).current;

    const handlePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,

            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 0,

            onPanResponderGrant: () => {
            gestureStartY.current = panY._value || NORMAL_Y;
            },

            onPanResponderMove: (evt, gs) => {
            const newY = gestureStartY.current + gs.dy;
            panY.setValue(Math.max(NORMAL_Y, Math.min(CLOSE_Y, newY)));
            },

            onPanResponderRelease: (evt, gs) => {
            const velocity = gs.vy;
            const currentY = panY._value || 0;

            const shouldClose = currentY > 60 || velocity > 0.8;
            const shouldExpand = currentY < -screenH * 0.2 || velocity < -0.8;

            if (shouldClose) {
                Animated.timing(panY, {
                toValue: CLOSE_Y,
                duration: 250,
                useNativeDriver: true,
                }).start(() => onCloseRef.current());
                return;
            }

            if (shouldExpand) {
                Animated.spring(panY, {
                toValue: FULL_Y,
                useNativeDriver: true,
                }).start();
                return;
            }

            Animated.spring(panY, {
                toValue: NORMAL_Y,
                useNativeDriver: true,
            }).start();
            },
        })
    ).current;

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
      animationType="none"
      transparent
      onRequestClose={() =>
        Animated.timing(panY, {
          toValue: CLOSE_Y,
          duration: 250,
          useNativeDriver: true,
        }).start(() => onCloseRef.current())
      }
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() =>
              Animated.timing(panY, {
                toValue: CLOSE_Y,
                duration: 250,
                useNativeDriver: true,
              }).start(() => onCloseRef.current())
            }
          />

          <Animated.View
            style={[
              styles.modalPanel,
              { backgroundColor: colors.background, transform: [{ translateY: panY }] },
            ]}
            
          >
            {/* Drag zone: handle bar + header — uses the eager responder */}
            <View {...handlePanResponder.panHandlers}>
              <View style={styles.handleBar} />
              <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#333' : '#ddd' }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Comentarios ({comments.length})
                </Text>
              </View>
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
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
    backdrop: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalPanel: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ccc',
        alignSelf: 'center',
        marginTop: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
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