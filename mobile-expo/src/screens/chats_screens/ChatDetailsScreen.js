// Reemplazar todo el contenido de ChatDetailsScreen.js por este código:
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Alert,
  Animated,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

const GREEN_ACCENT = '#546F1C';

// Componente de burbuja animada adaptado para Firestore
const MessageItem = ({ 
  item, 
  isMe, 
  isDark, 
  colors, 
  chatName, 
  isSelected, 
  selectedMessageId, 
  setSelectedMessageId, 
  setShowMsgInfo 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const myBubbleBgColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [GREEN_ACCENT, '#73942B'],
  });

  const otherBubbleBgColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isDark ? '#1C1C1C' : '#EFEFEF',
      isDark ? '#2C3A16' : '#D4E6A7',
    ],
  });

  const rowBgColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(157, 189, 63, 0)', 'rgba(157, 189, 63, 0.18)'],
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isSelected]);

  const handlePressIn = () => {
    if (isSelected) return;
    Animated.timing(fadeAnim, { toValue: 1, duration: 80, useNativeDriver: false }).start();
  };

  const handlePressOut = () => {
    if (isSelected) return;
    Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start();
  };

  const handlePress = () => {
    if (selectedMessageId) {
      isSelected ? setSelectedMessageId(null) : (setSelectedMessageId(item.id), setShowMsgInfo(false));
    }
  };

  const handleLongPress = () => {
    setSelectedMessageId(item.id);
    setShowMsgInfo(false);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={450}
      style={{ width: '100%' }}
    >
      <Animated.View style={[
        isMe ? styles.myMessageRow : styles.otherMessageRow,
        isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
        { backgroundColor: rowBgColor },
      ]}>
        {!isMe && (
          <View style={[styles.bubbleAvatarCircle, { marginRight: 8, marginHorizontal: 0 }]}>
            <Text style={styles.bubbleAvatarText}>{chatName.charAt(0)}</Text>
          </View>
        )}

        <Animated.View style={[
          isMe ? styles.myMessageBubble : styles.otherMessageBubble,
          { backgroundColor: isMe ? myBubbleBgColor : otherBubbleBgColor },
          isMe ? { borderBottomRightRadius: 2 } : { borderBottomLeftRadius: 2 },
        ]}>
          <Text style={[styles.messageText, { color: isMe ? '#FFF' : colors.text }]}>
            {item.text}
            {"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
          </Text>
          <View style={styles.timeRow}>
            {item.isFavorite && <Ionicons name="star" size={11} color={isMe ? '#FFEE00' : '#FFD700'} style={{ marginRight: 4 }} />}
            <Text style={[styles.messageTime, { color: isMe ? '#E1E1E1' : '#888' }]}>{item.time}</Text>
            {isMe && <Ionicons name={item.read ? "checkmark-done" : "checkmark"} size={14} color={item.read ? '#FFEE00' : '#E1E1E1'} style={{ marginLeft: 4 }} />}
          </View>
        </Animated.View>

        {isMe && (
          <View style={[styles.bubbleAvatarCircle, { backgroundColor: '#444', borderColor: '#CCC', marginLeft: 8, marginHorizontal: 0 }]}>
            <Text style={[styles.bubbleAvatarText, { color: '#FFF' }]}>M</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

export default function ChatDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colors.text === '#FFFFFF';
  
  const { chatId, name: chatName } = route.params;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showMoreSubMenu, setShowMoreSubMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [showMsgInfo, setShowMsgInfo] = useState(false);

  const flatListRef = useRef(null);
  const activeMsg = messages.find(m => m.id === selectedMessageId);

  // Escuchar mensajes en tiempo real desde Firestore
  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        let timeString = '';
        if (data.createdAt) {
          const date = data.createdAt.toDate();
          timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return {
          id: docSnapshot.id,
          text: data.text,
          sender: data.sender === auth.currentUser?.uid ? 'me' : 'other',
          time: timeString,
          read: data.read || false,
          isFavorite: data.isFavorite || false
        };
      });

      setMessages(msgs);
      setLoading(false);
    });

    return unsubscribe;
  }, [chatId]);

  const closeAllMenus = () => {
    setShowHeaderMenu(false);
    setShowMoreSubMenu(false);
    setShowAttachmentMenu(false);
  };

  // Enviar o editar mensaje en Firestore
  const handleSend = async () => {
    if (inputText.trim() === '') return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      if (editingMessageId) {
        // Guardar edición
        const msgRef = doc(db, `chats/${chatId}/messages/${editingMessageId}`);
        await updateDoc(msgRef, { text: inputText.trim() });
        setEditingMessageId(null);
      } else {
        // Enviar nuevo
        const messagesRef = collection(db, `chats/${chatId}/messages`);
        await addDoc(messagesRef, {
          text: inputText.trim(),
          sender: user.uid,
          createdAt: serverTimestamp(),
          read: false,
          isFavorite: false
        });

        // Actualizar último mensaje en la cabecera del chat
        const chatRef = doc(db, `chats/${chatId}`);
        await updateDoc(chatRef, {
          lastMessage: inputText.trim(),
          lastMessageTime: serverTimestamp(),
          lastSender: user.uid
        });
      }
    } catch (error) {
      console.log("Error al enviar mensaje:", error);
    }
    
    setInputText('');
  };

  const handleReply = () => {
    if (!activeMsg) return;
    Alert.alert('Responder', `Respondiendo a: "${activeMsg.text}"`);
    setSelectedMessageId(null);
  };

  const handleFavorite = async () => {
    if (!selectedMessageId || !activeMsg) return;
    try {
      const msgRef = doc(db, `chats/${chatId}/messages/${selectedMessageId}`);
      await updateDoc(msgRef, { isFavorite: !activeMsg.isFavorite });
    } catch (error) {
      console.log("Error al marcar favorito:", error);
    }
    setSelectedMessageId(null);
  };

  const handleDelete = () => {
    if (!selectedMessageId) return;
    Alert.alert(
      'Eliminar Mensaje',
      '¿Deseas eliminar este mensaje de Firestore?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              const msgRef = doc(db, `chats/${chatId}/messages/${selectedMessageId}`);
              await deleteDoc(msgRef);
            } catch (error) {
              console.log("Error al borrar mensaje:", error);
            }
            setSelectedMessageId(null);
          }
        }
      ]
    );
  };

  const handleForward = () => {
    if (!activeMsg) return;
    Alert.alert('Reenviar', `Reenviando mensaje: "${activeMsg.text}"`);
    setSelectedMessageId(null);
  };

  const handleCopy = () => {
    if (!activeMsg) return;
    Alert.alert('Copiado', 'El mensaje se ha copiado al portapapeles');
    setSelectedMessageId(null);
  };

  const handleStartEdit = () => {
    if (!activeMsg || activeMsg.sender !== 'me') return;
    setInputText(activeMsg.text);
    setEditingMessageId(activeMsg.id);
    setSelectedMessageId(null);
  };

  const renderMessageItem = ({ item }) => {
    const isMe = item.sender === 'me';
    const isSelected = selectedMessageId === item.id;
    return (
      <MessageItem
        item={item}
        isMe={isMe}
        isDark={isDark}
        colors={colors}
        chatName={chatName}
        isSelected={isSelected}
        selectedMessageId={selectedMessageId}
        setSelectedMessageId={setSelectedMessageId}
        setShowMsgInfo={setShowMsgInfo}
      />
    );
  };
  
  return (
    <TouchableWithoutFeedback onPress={closeAllMenus}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* HEADER DUAL */}
        {selectedMessageId ? (
          <View style={[styles.toolHeader, { backgroundColor: isDark ? '#1C1C1C' : '#E0EAE0', paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => setSelectedMessageId(null)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
            
            {activeMsg?.sender === 'me' ? (
              <>
                <TouchableOpacity style={styles.toolIcon} onPress={handleReply}>
                  <Ionicons name="arrow-undo" size={22} color={colors.text} />
                  <Text style={[styles.toolText, { color: colors.text }]}>responder</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.toolIcon} onPress={handleFavorite}>
                  <Ionicons name={activeMsg?.isFavorite ? "star" : "star-outline"} size={22} color={colors.text} />
                  <Text style={[styles.toolText, { color: colors.text }]}>favorito</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.toolIcon} onPress={handleStartEdit}>
                  <Ionicons name="pencil" size={22} color={colors.text} />
                  <Text style={[styles.toolText, { color: colors.text }]}>editar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.toolIcon} onPress={handleDelete}>
                  <Ionicons name="trash" size={22} color="#a70d0d" />
                  <Text style={[styles.toolText, { color: '#a70d0d' }]}>eliminar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolIcon} onPress={handleCopy}>
                  <Ionicons name="copy" size={22} color={colors.text} />
                  <Text style={[styles.toolText, { color: colors.text }]}>copiar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.toolIcon} onPress={handleReply}>
                  <Ionicons name="arrow-undo" size={22} color={colors.text} />
                  <Text style={[styles.toolText, { color: colors.text }]}>responder</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.toolIcon} onPress={handleFavorite}>
                  <Ionicons name={activeMsg?.isFavorite ? "star" : "star-outline"} size={22} color={colors.text} />
                  <Text style={[styles.toolText, { color: colors.text }]}>favorito</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.toolIcon} onPress={handleCopy}>
                  <Ionicons name="copy" size={22} color={colors.text} />
                  <Text style={[styles.toolText, { color: colors.text }]}>copiar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={[styles.header, { backgroundColor: isDark ? '#0B0B0B' : '#F5F5F5', paddingTop: insets.top + 8 }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 8 }}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{chatName.charAt(0)}</Text>
              </View>
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
                  {chatName}
                </Text>
                <Text style={styles.headerSubtitle}>en línea</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => { setShowHeaderMenu(!showHeaderMenu); }}>
                <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LISTA DE MENSAJES */}
        {loading ? (
          <ActivityIndicator size="large" color={GREEN_ACCENT} style={{ flex: 1 }} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* INPUT DE MENSAJE */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.inputContainer}>
            <View style={[styles.textInputWrapper, { backgroundColor: isDark ? '#1C1C1C' : '#F2F2F2' }]}>
              <TextInput
                placeholder={editingMessageId ? "Editar mensaje..." : "Mensaje"}
                placeholderTextColor="#888"
                value={inputText}
                onChangeText={setInputText}
                style={[styles.textInput, { color: colors.text }]}
                multiline
              />
            </View>

            <TouchableOpacity 
              onPress={handleSend}
              style={[styles.actionButton, { backgroundColor: GREEN_ACCENT }]}
            >
              <Ionicons 
                name={inputText.trim().length > 0 ? "send" : "mic-outline"} 
                size={22} 
                color="#FFF" 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#ccc' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerName: { fontSize: 18, fontFamily: 'Nunito-Bold', maxWidth: 150 },
  headerSubtitle: { fontSize: 12, color: '#888', fontFamily: 'Nunito-Regular' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { padding: 6 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00A3FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFEE00' },
  avatarText: { color: '#FFEE00', fontSize: 20, fontWeight: 'bold', fontStyle: 'italic' },
  toolHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, justifyContent: 'space-between' },
  toolIcon: { alignItems: 'center', paddingHorizontal: 4 },
  toolText: { fontSize: 10, marginTop: 2, fontFamily: 'Nunito-Regular' },
  messagesList: { paddingVertical: 20, gap: 16 },
  myMessageRow: { flexDirection: 'row', alignItems: 'flex-end', width: '100%', paddingHorizontal: 16, paddingVertical: 4 },
  otherMessageRow: { flexDirection: 'row', alignItems: 'flex-end', width: '100%', paddingHorizontal: 16, paddingVertical: 4 },
  bubbleAvatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#00A3FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFEE00' },
  bubbleAvatarText: { color: '#FFEE00', fontSize: 15, fontWeight: 'bold' },
  myMessageBubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 15, maxWidth: '100%', flexShrink: 1, elevation: 1 },
  otherMessageBubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 15, maxWidth: '100%', flexShrink: 1, elevation: 1 },
  messageText: { fontSize: 15, fontFamily: 'Nunito-Regular', lineHeight: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, alignSelf: 'flex-end' },
  messageTime: { fontSize: 13, fontFamily: 'Nunito-Regular' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  textInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 25, paddingHorizontal: 8, minHeight: 48, maxHeight: 100 },
  textInput: { flex: 1, fontSize: 16, fontFamily: 'Nunito-Regular', paddingHorizontal: 10, paddingVertical: 8 },
  actionButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }
});