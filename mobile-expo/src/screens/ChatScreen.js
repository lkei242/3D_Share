import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '@react-navigation/native';
import { auth, db } from './config/firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const v1 = '#546F1C';
const v2 = '#9DBD3F';

export default function ChatScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState(0);
  
  const caretAnims = [useRef(new Animated.Value(1)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
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

    // Consulta de salas de chat donde el usuario actual sea un participante
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let chatList = snapshot.docs.map(doc => {
        const data = doc.data();
        const otherParticipantName = data.participantNames?.find(name => name !== user.email) || 'Usuario';
        
        let lastMsgTime = '';
        if (data.lastMessageTime) {
          const date = data.lastMessageTime.toDate();
          lastMsgTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return {
          id: doc.id,
          name: otherParticipantName,
          message: data.lastMessage || 'Sin mensajes aún',
          time: lastMsgTime,
        };
      });

      // Crear chat inicial si la base de datos está totalmente vacía
      if (chatList.length === 0) {
        const newChatRef = await addDoc(chatsRef, {
          participants: [user.uid, 'flexi-jimga-id'],
          participantNames: [user.email, 'Flexi JIMGA'],
          lastMessage: '¡Hola! Bienvenido a 3D_Share',
          lastMessageTime: new Date(),
          lastSender: 'flexi-jimga-id',
        });

        await addDoc(collection(db, `chats/${newChatRef.id}/messages`), {
          text: '¡Hola! Bienvenido a 3D_Share',
          sender: 'flexi-jimga-id',
          createdAt: new Date(),
          read: true,
          isFavorite: false
        });
      }

      setChats(chatList);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const renderChatItem = React.useCallback(({ item }) => (
    <TouchableOpacity 
      style={styles.chatRow} 
      activeOpacity={0.7} 
      onPress={() => navigation.navigate('ChatDetail', { chatId: item.id, name: item.name })}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
      </View>

      <View style={styles.chatDetails}>
        <View style={styles.chatHeaderRow}>
          <Text style={[styles.chatName, { color: colors.text }]}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <Text style={[styles.chatMessage, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={1}>
          {item.message}
        </Text>
      </View>
    </TouchableOpacity>
  ), [colors, isDark, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1C1C1C' : '#F5F5F5', paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <View style={styles.titleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.solicitudesButton}>
          <Text style={[styles.solicitudesText, { color: colors.text }]}>Solicitudes</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros animados */}
      <View style={styles.filterContainer}>
        {['Mensajes', 'Grupos', 'Difusión'].map((label, index) => {
          const isActive = activeTab === index;
          const textColor = caretAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)', '#9DBD3F'],
          });
          const caretTranslateY = caretAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [6, 0],   // sube desde abajo al activarse
          });
          const caretOpacity = caretAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          });
          return (
            <TouchableOpacity
              key={label}
              style={styles.filterTab}
              activeOpacity={0.7}
              onPress={() => switchTab(index)}
            >
              {/* Caret encima del texto, animado */}
              <Animated.View style={{
                alignItems: 'center',
                opacity: caretOpacity,
                transform: [{ translateY: caretTranslateY }],
                marginBottom: 2,
              }}>
                <Ionicons name="caret-down" size={22} color="#9DBD3F" />
              </Animated.View>

              <Animated.Text style={[
                styles.filterText,
                { color: textColor, fontFamily: isActive ? 'Nunito-Bold' : 'Nunito-Regular' },
              ]}>
                {label}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {/* Buscador */}
      {isDark ? (
        <LinearGradient
          colors={[v1, '#121212']}
          locations={[0, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.searchContainer}
        >
          <Feather name="search" size={20} color={'#FFFFFF'} style={styles.searchIcon} />
          <TextInput placeholder="Buscar chats" placeholderTextColor="#FFFFFF" style={[styles.searchInput, { color: colors.text }]} />
        </LinearGradient>
      ) : (
        <LinearGradient
          colors={[v2, '#ffffff']}
          locations={[0, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.searchContainer}
        >
          <Feather name="search" size={20} color={'#121212'} style={styles.searchIcon} />
          <TextInput placeholder="Buscar chats" placeholderTextColor="#121212" style={[styles.searchInput, { color: colors.text }]} />
        </LinearGradient>
      )}

      {/* Lista de Chats */}
      {loading ? (
        <ActivityIndicator size="large" color={v1} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 46, height: 46 },
  titleContainer: { alignItems: 'center', position: 'relative' },
  headerTitle: { marginLeft: 8,fontSize: 24, fontFamily: 'Nunito-Bold' },
  caretIcon: { position: 'absolute', bottom: -14 },
  solicitudesButton: { paddingVertical: 6 },
  solicitudesText: { fontSize: 16, fontFamily: 'Nunito-Bold' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 32, marginTop: -7 , paddingBottom: 6, gap: 62 },
  filterTab: { alignItems: 'center' },
  filterText: { fontSize: 20, fontFamily: 'Nunito-Regular' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 18, marginBottom: 8, marginRight: 0, borderTopLeftRadius: 20, borderBottomLeftRadius: 20, paddingHorizontal: 14, height: 42 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontFamily: 'Nunito-Regular', fontSize: 16, paddingVertical: 0 },
  listContent: { paddingBottom: 20 },
  chatRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  avatarContainer: { marginRight: 12 },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#00A3FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFEE00' },
  avatarText: { color: '#FFEE00', fontSize: 28, fontWeight: 'bold', fontStyle: 'italic' },
  chatDetails: { flex: 1, justifyContent: 'center' },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  chatName: { fontSize: 16, fontFamily: 'Nunito-Bold' },
  chatTime: { color: '#888', fontSize: 13, fontFamily: 'Nunito-Regular' },
  chatMessage: { fontSize: 14, fontFamily: 'Nunito-Regular' }
});