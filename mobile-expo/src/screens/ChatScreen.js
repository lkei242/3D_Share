import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import { deleteMediaFromCloudinary } from './config/mediaHelper';
import { auth, db } from './config/firebase';
import { collection, query, where, onSnapshot, addDoc, getDocs, getDoc, doc, arrayUnion, arrayRemove, deleteDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getUserMessagePreference, checkMutualFollow, sendMessageRequest, getMessageRequest } from './config/userActions';
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
  Modal,
  Alert,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [selectedChat, setSelectedChat] = useState(null);
  const [showManagement, setShowManagement] = useState(false);
  const managementOpacity = useRef(new Animated.Value(0)).current;
  const managementSlide = useRef(new Animated.Value(300)).current;
  
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

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  // --- Grupos y listas de difusión ---
  const [groupChatsList, setGroupChatsList] = useState([]);
  const [broadcastLists, setBroadcastLists] = useState([]);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showNewBroadcastModal, setShowNewBroadcastModal] = useState(false);
  const [selectableUsers, setSelectableUsers] = useState([]);
  const [fetchingSelectable, setFetchingSelectable] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [broadcastNameInput, setBroadcastNameInput] = useState('');

  // --- Modal de confirmación propio de la app (reemplaza los Alert.alert de
  // borrado de chat, tanto en handleDeleteChat como en checkAndDelete) ---
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  const confirmOpacity = useRef(new Animated.Value(0)).current;
  const confirmScale = useRef(new Animated.Value(0.9)).current;

  const openConfirmModal = ({ title, message, onConfirm }) => {
    setConfirmModal({ title, message, onConfirm });
    confirmScale.setValue(0.9);
    Animated.parallel([
      Animated.timing(confirmOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(confirmScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
    ]).start();
  };

  const closeConfirmModal = (onClosed) => {
    Animated.timing(confirmOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setConfirmModal(null);
      if (onClosed) onClosed();
    });
  };

  // --- Toast propio de la app (avisos cortos dentro de los modales, ej. campos faltantes) ---
  const [groupToast, setGroupToast] = useState('');
  const groupToastOpacity = useRef(new Animated.Value(0)).current;
  const groupToastTimer = useRef(null);

  const showGroupToast = (message) => {
    setGroupToast(message);
    if (groupToastTimer.current) clearTimeout(groupToastTimer.current);
    Animated.timing(groupToastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    groupToastTimer.current = setTimeout(() => {
      Animated.timing(groupToastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setGroupToast(''));
    }, 2000);
  };

  useFocusEffect(
    useCallback(() => {
      cleanupPendingDeletions();
    }, [])
  );

  // Cargar usuarios a los que sigue
  const handleOpenNewChat = async () => {
    setShowNewChatModal(true);
    setFetchingUsers(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Consultar la colección 'followers' donde soy el seguidor
      const q = query(collection(db, 'followers'), where('followerId', '==', user.uid));
      const snapshot = await getDocs(q);
      const followingIds = snapshot.docs.map(doc => doc.data().userId);

      const usersData = [];
      for (const uid of followingIds) {
        // 1. Verificar si ya tenemos una sala de chat con este usuario
        const hasExistingChat = chats.some(c => c.kind !== 'group' && c.participants && c.participants.includes(uid));
        if (hasExistingChat) continue; // Si ya existe el chat, salta al siguiente seguidor (no lo muestra)
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const data = userDoc.data();

          let picUrl = data.profilePicture || '';
          if (picUrl.startsWith('http://')) {
            picUrl = picUrl.replace('http://', 'https://');
          }

          usersData.push({
            id: uid,
            uid: uid,
            name: data.profileName || data.username || 'Usuario',
            username: data.username || 'usuario',
            email: data.email || '',
            profilePicture: picUrl,
          });
        }
      }
      // Filtrar usuarios con restricción de mensajes
      const filteredUsers = [];
      for (const u of usersData) {
        const pref = await getUserMessagePreference(u.uid);
        if (pref) {
          filteredUsers.push(u);
        } else {
          const isMutual = await checkMutualFollow(user.uid, u.uid);
          if (isMutual) {
            filteredUsers.push(u);
          } else {
            const existingReq = await getMessageRequest(user.uid, u.uid);
            if (existingReq && existingReq.status === 'approved') {
              filteredUsers.push(u);
            }
          }
        }
      }
      setFollowingUsers(filteredUsers);

    } catch (err) {
      console.log('Error al cargar seguidos para chat:', err);
    } finally {
      setFetchingUsers(false);
    }
  };

  // Al seleccionar un usuario para chatear — el chat se crea al enviar el primer mensaje
  const handleSelectUser = async (targetUser) => {
    setShowNewChatModal(false);
    const user = auth.currentUser;
    if (!user) return;
    // 1. Buscar en chats visibles (no eliminados por el usuario actual)
    const existingChat = chats.find(c => c.kind !== 'group' && c.participants && c.participants.includes(targetUser.uid));
    if (existingChat) {
      navigation.navigate('ChatDetail', {
        chatId: existingChat.id,
        name: existingChat.name,
        username: existingChat.username,
        profilePicture: existingChat.profilePicture,
        otherUid: targetUser.uid,
      });
      return;
    }
    // Verificar si el usuario destino tiene restricción de mensajes
    const targetPref = await getUserMessagePreference(targetUser.uid);
    if (!targetPref) {
      const isMutual = await checkMutualFollow(user.uid, targetUser.uid);
      if (!isMutual) {
        const existingRequest = await getMessageRequest(user.uid, targetUser.uid);
        if (!existingRequest || existingRequest.status !== 'approved') {
          if (existingRequest && existingRequest.status === 'pending') {
            Alert.alert('Solicitud pendiente', 'Ya enviaste una solicitud a este usuario. Esperá a que la apruebe.');
          } else {
            Alert.alert(
              'Mensajes restringidos',
              'Este usuario tiene habilitada la función de mensajes por follow mutuo, por lo cual no puedes chatear con él a menos que él te siga o que apruebe tu solicitud de mensaje',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Enviar solicitud de mensaje',
                  style: 'default',
                  onPress: async () => {
                    const ok = await sendMessageRequest(user.uid, targetUser.uid);
                    if (ok) Alert.alert('Solicitud enviada', 'Tu solicitud de mensaje fue enviada. Esperá a que el usuario la apruebe.');
                  },
                },
              ]
            );
          }
          setShowNewChatModal(false);
          return;
        }
      }
    }
    // Buscar en Firestore un chat eliminado por el usuario actual (para restaurar)
    try {
      const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
      const snap = await getDocs(q);
      const deletedChatDoc = snap.docs.find(d => {
        const data = d.data();
        const deletedBy = data.deletedBy || [];
        return data.participants?.includes(targetUser.uid) && deletedBy.includes(user.uid);
      });
      if (deletedChatDoc) {
        const deletedBy = deletedChatDoc.data().deletedBy || [];
        const bothDeleted = deletedBy.includes(targetUser.uid);
        if (bothDeleted) {
          // Ambos eliminaron y el doc aún existe (debería haberse borrado) → borrar y crear nuevo
          await permanentlyDeleteChat(deletedChatDoc.id);
        } else {
          // Solo el usuario actual eliminó → restaurar quitando su UID de deletedBy
          await updateDoc(deletedChatDoc.ref, { deletedBy: arrayRemove(user.uid) });
          navigation.navigate('ChatDetail', {
            chatId: deletedChatDoc.id,
            name: targetUser.name,
            username: targetUser.username,
            profilePicture: targetUser.profilePicture || '',
            otherUid: targetUser.uid,
          });
          return;
        }
      }
    } catch (err) {
      console.log('Error buscando chat eliminado:', err);
    }
    // 3. No existe chat previo → crear nuevo
    navigation.navigate('ChatDetail', {
      chatId: null,
      name: targetUser.name,
      username: targetUser.username,
      profilePicture: targetUser.profilePicture || '',
      otherUid: targetUser.uid,
      isNewChat: true,
    });
  };

  // --- Cargar seguidos para seleccionar miembros (grupos y difusión) ---
  const fetchFollowingUsers = async () => {
    setFetchingSelectable(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'followers'), where('followerId', '==', user.uid));
      const snapshot = await getDocs(q);
      const followingIds = snapshot.docs.map(d => d.data().userId);

      const usersData = [];
      for (const uid of followingIds) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          let picUrl = data.profilePicture || '';
          if (picUrl.startsWith('http://')) {
            picUrl = picUrl.replace('http://', 'https://');
          }
          usersData.push({
            id: uid,
            uid,
            name: data.profileName || data.username || 'Usuario',
            username: data.username || 'usuario',
            profilePicture: picUrl,
          });
        }
      }
      setSelectableUsers(usersData);
    } catch (err) {
      console.log('Error al cargar seguidos para selección:', err);
    } finally {
      setFetchingSelectable(false);
    }
  };

  const toggleMemberSelection = (uid) => {
    setSelectedMemberIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleOpenNewGroupModal = () => {
    setSelectedMemberIds([]);
    setGroupNameInput('');
    setShowNewGroupModal(true);
    fetchFollowingUsers();
  };

  const handleOpenNewBroadcastModal = () => {
    setSelectedMemberIds([]);
    setBroadcastNameInput('');
    setShowNewBroadcastModal(true);
    fetchFollowingUsers();
  };

  const handleCreateGroup = async () => {
    const user = auth.currentUser;
    if (!user || selectedMemberIds.length === 0) return;
    if (!groupNameInput.trim()) {
      showGroupToast('Ingresá un nombre para el grupo');
      return;
    }
    try {
      const newChatRef = await addDoc(collection(db, 'groupchats'), {
        groupName: groupNameInput.trim(),
        groupPhoto: '',
        participants: [user.uid, ...selectedMemberIds],
        admins: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageTime: null,
      });
      setShowNewGroupModal(false); // cierra el modal "Nuevo grupo" al crearlo
      navigation.navigate('ChatDetailGroup', {
        chatId: newChatRef.id,
        groupName: groupNameInput.trim(),
        groupPhoto: '',
        participants: [user.uid, ...selectedMemberIds],
        isNewChat: true,
      });
    } catch (err) {
      console.log('Error al crear grupo:', err);
      showGroupToast('No se pudo crear el grupo');
    }
  };

  const handleCreateBroadcast = async () => {
    const user = auth.currentUser;
    if (!user || selectedMemberIds.length === 0 || !broadcastNameInput.trim()) return;
    try {
      const newListRef = await addDoc(collection(db, 'broadcastLists'), {
        name: broadcastNameInput.trim(),
        ownerId: user.uid,
        recipients: selectedMemberIds,
        photo: '',
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageTime: null,
      });
      setShowNewBroadcastModal(false);
      // TODO: pendiente definir la pantalla/comportamiento de envío de difusión
      navigation.navigate('BroadcastDetail', {
        broadcastId: newListRef.id,
        name: broadcastNameInput.trim(),
        recipients: selectedMemberIds,
        isNewChat: true,
      });
    } catch (err) {
      console.log('Error al crear lista de difusión:', err);
    }
  };

  const handleLeaveGroup = async (chat) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const groupRef = doc(db, 'groupchats', chat.id);
      await updateDoc(groupRef, {
        participants: arrayRemove(user.uid),
        admins: arrayRemove(user.uid),
      });
      const freshSnap = await getDoc(groupRef);
      if (freshSnap.exists() && (freshSnap.data().participants || []).length === 0) {
        await permanentlyDeleteGroup(chat.id);
      }
    } catch (err) {
      console.log('Error al salir del grupo:', err);
    }
  };

  const handleDeleteBroadcast = async (chat) => {
    try {
      await deleteDoc(doc(db, 'broadcastLists', chat.id));
    } catch (err) {
      console.log('Error al eliminar lista de difusión:', err);
    }
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

  const showManagementCard = (chat) => {
    setSelectedChat(chat);
    setShowManagement(true);
    Animated.parallel([
      Animated.timing(managementOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(managementSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const closeManagementCard = (onClosed) => {
    Animated.parallel([
      Animated.timing(managementOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(managementSlide, { toValue: 300, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setShowManagement(false);
      setSelectedChat(null);
      if (onClosed) onClosed();
    });
  };

  const handlePin = () => {
    Alert.alert('Fijado', `${selectedChat.name} fijado al inicio`);
    closeManagementCard();
  };

  const handleDeleteChat = () => {
    const chat = selectedChat;
    closeManagementCard(() => {
      if (chat.kind === 'group') {
        openConfirmModal({
          title: 'Salir del grupo',
          message: `¿Salir de "${chat.name}"? Ya no recibirás sus mensajes.`,
          onConfirm: () => handleLeaveGroup(chat),
        });
      } else if (chat.kind === 'broadcast') {
        openConfirmModal({
          title: 'Eliminar lista',
          message: `¿Eliminar la lista de difusión "${chat.name}"? Esta acción no se puede deshacer.`,
          onConfirm: () => handleDeleteBroadcast(chat),
        });
      } else {
        openConfirmModal({
          title: 'Eliminar chat',
          message: '¿Eliminar esta conversación?',
          onConfirm: () => checkAndDelete(chat),
        });
      }
    });
  };

  const handleMute = () => {
    Alert.alert('Silenciado', `Notificaciones de ${selectedChat.name} silenciadas`);
    closeManagementCard();
  };

  const handleArchive = () => {
    Alert.alert('Archivado', `${selectedChat.name} archivado`);
    closeManagementCard();
  };

  const handleMore = () => {
    Alert.alert('Más opciones', `Opciones para ${selectedChat.name}`);
    closeManagementCard();
  };

  const checkAndDelete = async (chat) => {
    try {
      const user = auth.currentUser;
      const chatRef = doc(db, 'chats', chat.id);
      const otherUid = chat.otherUid;

      // Leer datos FRESCOS de Firestore (no confiar en el estado)
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) return;
      const freshDeletedBy = chatSnap.data().deletedBy || [];
      const otherAlreadyDeleted = freshDeletedBy.includes(otherUid);

      if (otherAlreadyDeleted) {
        openConfirmModal({
          title: 'Eliminar chat',
          message: 'Eres el ultimo usuario con una copia del chat.\n\nLuego de eliminar este chat su contenido se borrará para siempre.',
          onConfirm: async () => {
            await updateDoc(chatRef, { deletedBy: arrayUnion(user.uid) });
            await permanentlyDeleteChat(chat.id);
          },
        });
        return;
        
      }

      // Si no se cumplen las condiciones: solo marcar como eliminado por este usuario
      await updateDoc(chatRef, { deletedBy: arrayUnion(user.uid) });
    } catch (err) {
      console.log('Error al verificar borrado:', err);
    }
  };

  const permanentlyDeleteChat = async (chatId) => {
    try {
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      const messagesSnap = await getDocs(messagesRef);

      // 1. Recopilar todas las URLs de Cloudinary a eliminar
      const cloudinaryDeletions = [];
      for (const d of messagesSnap.docs) {
        const data = d.data();

        // Mensajes con un solo archivo (image, video, audio, file)
        if (data.mediaUrl) {
          cloudinaryDeletions.push(
            deleteMediaFromCloudinary(data.mediaUrl).catch(e =>
              console.log('Error borrando media de Cloudinary:', e)
            )
          );
        }

        // Mensajes con múltiples archivos (media_group)
        if (Array.isArray(data.mediaItems)) {
          for (const item of data.mediaItems) {
            if (item.url) {
              cloudinaryDeletions.push(
                deleteMediaFromCloudinary(item.url).catch(e =>
                  console.log('Error borrando media del grupo:', e)
                )
              );
            }
          }
        }
      }

      // Esperar a que Cloudinary elimine todo
      await Promise.all(cloudinaryDeletions);

      // 2. Eliminar todos los mensajes de Firestore en paralelo
      await Promise.all(
        messagesSnap.docs.map(d =>
          deleteDoc(doc(db, `chats/${chatId}/messages/${d.id}`))
        )
      );

      // 3. Eliminar el documento del chat
      await deleteDoc(doc(db, 'chats', chatId));

      console.log('Chat borrado exitosamente (Firestore + Cloudinary)');
    } catch (err) {
      console.log('ERROR al borrar chat:', err.code, err.message);
    }
  };

  const permanentlyDeleteGroup = async (groupId) => {
    try {
      const messagesRef = collection(db, `groupchats/${groupId}/messages`);
      const messagesSnap = await getDocs(messagesRef);

      const cloudinaryDeletions = [];
      for (const d of messagesSnap.docs) {
        const data = d.data();
        if (data.mediaUrl) {
          cloudinaryDeletions.push(
            deleteMediaFromCloudinary(data.mediaUrl).catch(e =>
              console.log('Error borrando media de Cloudinary:', e)
            )
          );
        }
        if (Array.isArray(data.mediaItems)) {
          for (const item of data.mediaItems) {
            if (item.url) {
              cloudinaryDeletions.push(
                deleteMediaFromCloudinary(item.url).catch(e =>
                  console.log('Error borrando media del grupo:', e)
                )
              );
            }
          }
        }
      }
      await Promise.all(cloudinaryDeletions);
      await Promise.all(
        messagesSnap.docs.map(d =>
          deleteDoc(doc(db, `groupchats/${groupId}/messages/${d.id}`))
        )
      );
      await deleteDoc(doc(db, 'groupchats', groupId));
      console.log('Grupo borrado exitosamente (Firestore + Cloudinary)');
    } catch (err) {
      console.log('ERROR al borrar grupo:', err.code, err.message);
    }
  };

  const cleanupPendingDeletions = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('participants', 'array-contains', user.uid));
      const snap = await getDocs(q);

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const deletedBy = data.deletedBy || [];
        if (deletedBy.length >= 2 && deletedBy.includes(user.uid)) {
          const otherUid = data.participants?.find(uid => uid !== user.uid);
          if (otherUid && deletedBy.includes(otherUid)) {
            await permanentlyDeleteChat(docSnap.id);
          }
        }
      }
    } catch (err) {
      console.log('Error en cleanupPendingDeletions:', err);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Consulta de salas de chat donde el usuario actual sea un participante
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();

        // --- Chat individual ---
        const otherParticipantUid = data.participants?.find(uid => uid !== user.uid);
        
        let otherParticipantName = 'Usuario';
        let otherProfilePicture = '';
        let otherUsername = '';

        if (otherParticipantUid) {
          try {
            const userDoc = await getDoc(doc(db, 'users', otherParticipantUid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              otherParticipantName = userData.profileName || userData.username || 'Usuario';
              otherProfilePicture = userData.profilePicture || '';
              otherUsername = userData.username || '';
            } else {
              otherParticipantName = data.participantNames?.find(name => name !== user.email) || 'Usuario';
            }
          } catch (err) {
            console.log('Error cargando perfil en chat:', err);
            otherParticipantName = data.participantNames?.find(name => name !== user.email) || 'Usuario';
          }
        } else {
          otherParticipantName = data.participantNames?.find(name => name !== user.email) || 'Usuario';
        }

        let lastMsgTime = '';
        if (data.lastMessageTime) {
          const date = data.lastMessageTime.toDate();
          lastMsgTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return {
          id: docSnapshot.id,
          kind: 'individual',
          type: 'individual',
          name: otherParticipantName,
          username: otherUsername,
          profilePicture: otherProfilePicture,
          message: data.lastMessage || 'Sin mensajes aún',
          time: lastMsgTime,
          participants: data.participants || [],
          otherUid: otherParticipantUid,
          deletedBy: data.deletedBy || [],
        };
      });

      // Resolver TODOS los datos antes de usarlos
      const resolvedChats = await Promise.all(chatPromises);

      // 1. Background cleanup: datos crudos (antes del filtro)
      for (const chat of resolvedChats) {
        const deletedBy = chat.deletedBy || [];
        if (deletedBy.length >= 2 && deletedBy.includes(user.uid)) {
          const otherUid = chat.otherUid;
          if (otherUid && deletedBy.includes(otherUid)) {
            try {
              await permanentlyDeleteChat(chat.id);
            } catch (_) {}
          }
        }
      }

      // 2. Filtrar los chats donde el usuario actual ya eliminó (solo se ocultan de la vista)
      const chatList = resolvedChats.filter(c => !(c.deletedBy || []).includes(user.uid));

      setChats(chatList);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // --- Grupos (colección separada: groupchats) ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'groupchats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groups = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        let lastMsgTime = '';
        if (data.lastMessageTime) {
          lastMsgTime = data.lastMessageTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return {
          id: docSnapshot.id,
          kind: 'group',
          name: data.groupName || 'Grupo',
          username: '',
          profilePicture: data.groupPhoto || '',
          message: data.lastMessage || 'Sin mensajes aún',
          time: lastMsgTime,
          participants: data.participants || [],
          memberCount: (data.participants || []).length,
          admins: data.admins || [],
        };
      });
      setGroupChatsList(groups);
    });

    return unsubscribe;
  }, []);

  // --- Listas de difusión (colección separada: solo el dueño las ve) ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const listsRef = collection(db, 'broadcastLists');
    const q = query(listsRef, where('ownerId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lists = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        let lastMsgTime = '';
        if (data.lastMessageTime) {
          lastMsgTime = data.lastMessageTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return {
          id: docSnapshot.id,
          kind: 'broadcast',
          name: data.name || 'Lista de difusión',
          username: '',
          profilePicture: data.photo || '',
          recipients: data.recipients || [],
          message: data.lastMessage || 'Sin mensajes aún',
          time: lastMsgTime,
        };
      });
      setBroadcastLists(lists);
    });

    return unsubscribe;
  }, []);

  // chats solo contiene individuales; groupChatsList viene de su propio listener
  const individualChats = useMemo(() => chats, [chats]);
  const currentList = activeTab === 0 ? individualChats : activeTab === 1 ? groupChatsList : broadcastLists;

  const renderChatItem = React.useCallback(({ item }) => {
    const isGroup = item.kind === 'group';
    const isBroadcast = item.kind === 'broadcast';

    const handlePress = () => {
      if (isGroup) {
        navigation.navigate('ChatDetailGroup', {
          chatId: item.id,
          groupName: item.name,
          groupPhoto: item.profilePicture,
          participants: item.participants,
        });
      } else if (isBroadcast) {
        navigation.navigate('BroadcastDetail', {
          broadcastId: item.id,
          name: item.name,
          recipients: item.recipients,
        });
      } else {
        navigation.navigate('ChatDetail', {
          chatId: item.id,
          name: item.name,
          username: item.username,
          profilePicture: item.profilePicture,
          otherUid: item.otherUid,
        });
      }
    };

    return (
    <TouchableOpacity 
      style={styles.chatRow} 
      activeOpacity={0.7} 
      onPress={handlePress}
      onLongPress={() => showManagementCard(item)}
      delayLongPress={400}
    >
      <View style={styles.avatarContainer}>
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={[styles.avatarImage, { borderColor: isDark ? '#2A2A2A' : '#E0E0E0' }]} />
        ) : (
          <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0', borderColor: isDark ? '#2A2A2A' : '#F0F0F0', overflow: 'hidden', justifyContent: 'center', alignItems: 'center',  }]}>
            <Ionicons
              name={isGroup ? 'people-circle-outline' : isBroadcast ? 'megaphone-outline' : 'person-circle-outline'}
              size={53.5}
              color="#94BA46"
              style={{ marginLeft: -2.7, marginTop: -3.2 }}
            />
          </View>
        )}
      </View>

      <View style={styles.chatDetails}>
        <View style={styles.chatHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
            <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {!isGroup && !isBroadcast && !!item.username && (
              <Text style={{ fontSize: 13, color: isDark ? '#888' : '#777', fontFamily: 'Nunito-Regular' }} numberOfLines={1}>
                @{item.username}
              </Text>
            )}
            {isGroup && (
              <Text style={{ fontSize: 12, color: isDark ? '#888' : '#777', fontFamily: 'Nunito-Regular' }} numberOfLines={1}>
                · {item.memberCount} {item.memberCount === 1 ? 'miembro' : 'miembros'}
              </Text>
            )}
            {isBroadcast && (
              <Text style={{ fontSize: 12, color: isDark ? '#888' : '#777', fontFamily: 'Nunito-Regular' }} numberOfLines={1}>
                · {(item.recipients || []).length} destinatarios
              </Text>
            )}
          </View>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <Text style={[styles.chatMessage, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={1}>
          {item.message}
        </Text>
      </View>
    </TouchableOpacity>
    );
  }, [colors, isDark, navigation, showManagementCard]);

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
        <TouchableOpacity style={styles.solicitudesButton} onPress={() => navigation.navigate('MessageRequests')}>
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

      {/* Lista de Chats (individual / grupos / difusión según la pestaña activa) */}
      {loading ? (
        <ActivityIndicator size="large" color={v1} style={{ marginTop: 50 }} />
      ) : currentList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#666' }]}>
            {activeTab === 0
              ? 'No tenés chats todavía. Tocá el botón + para empezar uno.'
              : activeTab === 1
              ? 'No tenés grupos todavía. Tocá el botón + para crear uno.'
              : 'No tenés listas de difusión todavía. Tocá el botón + para crear una.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>

      {/* OVERLAY DE GESTIÓN DE CHAT */}
      {showManagement && (
        <Animated.View style={[styles.managementOverlay, { backgroundColor: 'rgba(0,0,0,0.4)', opacity: managementOpacity }]}>
          <TouchableWithoutFeedback onPress={() => closeManagementCard()}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.managementCard, { backgroundColor: isDark ? '#1C1C1C' : '#FFF', transform: [{ translateY: managementSlide }] }]}>
            {/* Info del chat seleccionado */}
            <View style={styles.managementChatInfo}>
              {selectedChat?.profilePicture ? (
                <Image source={{ uri: selectedChat.profilePicture }} style={[styles.managementAvatar, { borderColor: isDark ? '#2A2A2A' : '#E0E0E0' }]} />
              ) : (
                <View style={[styles.managementAvatarCircle, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                  <Ionicons name="person-circle-outline" size={53.5} color="#94BA46" style={{ marginLeft: -1, marginTop: -1 }} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.managementChatName, { color: colors.text }]} numberOfLines={1}>
                  {selectedChat?.name}
                </Text>
                {!!selectedChat?.username && (
                  <Text style={styles.managementChatUsername}>@{selectedChat.username}</Text>
                )}
              </View>
            </View>

            {/* 5 botones de acción */}
            <View style={styles.managementActions}>
              <TouchableOpacity style={styles.managementBtn} onPress={handlePin}>
                <MaterialCommunityIcons name="pin" size={24} color={colors.text} />
                <Text style={[styles.managementBtnText, { color: colors.text }]}>Fijar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.managementBtn} onPress={handleDeleteChat}>
                <Ionicons name={selectedChat?.kind === 'group' ? 'log-out-outline' : 'trash'} size={24} color="#a70d0d" />
                <Text style={[styles.managementBtnText, { color: '#a70d0d' }]}>
                  {selectedChat?.kind === 'group' ? 'Salir' : 'Eliminar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.managementBtn} onPress={handleMute}>
                <Ionicons name="notifications-off" size={24} color={colors.text} />
                <Text style={[styles.managementBtnText, { color: colors.text }]}>Silenciar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.managementBtn} onPress={handleArchive}>
                <Ionicons name="archive" size={24} color={colors.text} />
                <Text style={[styles.managementBtnText, { color: colors.text }]}>Archivar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.managementBtn} onPress={handleMore}>
                <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
                <Text style={[styles.managementBtnText, { color: colors.text }]}>Más</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Botón flotante: abre el flujo de creación según la pestaña activa */}
      <TouchableOpacity
        style={[styles.fabButton, { backgroundColor: v1 }]}
        activeOpacity={0.8}
        onPress={() => {
          if (activeTab === 0) handleOpenNewChat();
          else if (activeTab === 1) handleOpenNewGroupModal();
          else handleOpenNewBroadcastModal();
        }}
      >
        <Ionicons
          name={activeTab === 0 ? 'chatbubble-ellipses' : activeTab === 1 ? 'people' : 'megaphone'}
          size={26}
          color="#FFF"
        />
      </TouchableOpacity>

      {/* Modal para iniciar chat con seguidos */}
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1C' : '#FFF' }]}>
            {/* Cabecera del modal */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Iniciar chat</Text>
              <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Listado */}
            {fetchingUsers ? (
              <ActivityIndicator size="large" color={v1} style={{ marginTop: 40 }} />
            ) : followingUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#666' }]}>
                  Sigue a otros usuarios desde el buscador para chatear con ellos.
                </Text>
              </View>
            ) : (
              <FlatList
                data={followingUsers}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userRow}
                    activeOpacity={0.7}
                    onPress={() => handleSelectUser(item)}
                  >
                    {item.profilePicture ? (
                      <Image source={{ uri: item.profilePicture }} style={[styles.modalAvatarImage, { borderColor: isDark ? '#2A2A2A' : '#E0E0E0' }]} resizeMode="cover" />
                    ) : (
                      <View style={[styles.userAvatar, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0', overflow: 'hidden',  borderColor: isDark ? '#2A2A2A' : '#F0F0F0', }]}>
                        <Ionicons
                          name="person-circle-outline"
                          size={46}
                          color="#94BA46"
                          style={{ marginLeft: -1, marginTop: -2 }}
                        />
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={styles.userUsername}>@{item.username}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={isDark ? '#888' : '#ccc'} />
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para crear un grupo nuevo */}
      <Modal
        visible={showNewGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1C' : '#FFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nuevo grupo</Text>
              <TouchableOpacity onPress={() => setShowNewGroupModal(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Nombre del grupo"
              placeholderTextColor={isDark ? '#888' : '#999'}
              value={groupNameInput}
              onChangeText={setGroupNameInput}
              style={{
                borderWidth: 1,
                borderColor: isDark ? '#333' : '#DDD',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 16,
                fontFamily: 'Nunito-Regular',
                color: colors.text,
                marginBottom: 12,
              }}
            />

            {fetchingSelectable ? (
              <ActivityIndicator size="large" color={v1} style={{ marginTop: 40 }} />
            ) : selectableUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#666' }]}>
                  Sigue a otros usuarios desde el buscador para agregarlos a un grupo.
                </Text>
              </View>
            ) : (
              <FlatList
                data={selectableUsers}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => {
                  const isSelected = selectedMemberIds.includes(item.uid);
                  return (
                    <TouchableOpacity
                      style={styles.userRow}
                      activeOpacity={0.7}
                      onPress={() => toggleMemberSelection(item.uid)}
                    >
                      {item.profilePicture ? (
                        <Image source={{ uri: item.profilePicture }} style={[styles.modalAvatarImage, { borderColor: isDark ? '#2A2A2A' : '#E0E0E0' }]} resizeMode="cover" />
                      ) : (
                        <View style={[styles.userAvatar, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0', overflow: 'hidden', borderColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                          <Ionicons name="person-circle-outline" size={46} color="#94BA46" style={{ marginLeft: -1, marginTop: -2 }} />
                        </View>
                      )}
                      <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={styles.userUsername}>@{item.username}</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isSelected ? '#9DBD3F' : (isDark ? '#666' : '#ccc')}
                      />
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}

            <TouchableOpacity
              onPress={handleCreateGroup}
              disabled={selectedMemberIds.length === 0}
              style={{
                backgroundColor: (selectedMemberIds.length === 0 || !groupNameInput.trim()) ? (isDark ? '#333' : '#ddd') : v1,
                borderRadius: 24,
                paddingVertical: 14,
                alignItems: 'center',
                marginTop: 8,
                marginBottom: insets.bottom + 12
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontFamily: 'Nunito-Bold' }}>
                Crear grupo{selectedMemberIds.length > 0 ? ` (${selectedMemberIds.length})` : ''}
              </Text>
            </TouchableOpacity>

            {!!groupToast && (
              <Animated.View style={[styles.groupToast, { opacity: groupToastOpacity }]}>
                <Ionicons name="alert-circle" size={18} color="#FFF" />
                <Text style={styles.groupToastText}>{groupToast}</Text>
              </Animated.View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para crear una lista de difusión nueva */}
      <Modal
        visible={showNewBroadcastModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewBroadcastModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1C' : '#FFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva lista de difusión</Text>
              <TouchableOpacity onPress={() => setShowNewBroadcastModal(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Nombre de la lista"
              placeholderTextColor={isDark ? '#888' : '#999'}
              value={broadcastNameInput}
              onChangeText={setBroadcastNameInput}
              style={{
                borderWidth: 1,
                borderColor: isDark ? '#333' : '#DDD',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 16,
                fontFamily: 'Nunito-Regular',
                color: colors.text,
                marginBottom: 12,
              }}
            />

            {fetchingSelectable ? (
              <ActivityIndicator size="large" color={v1} style={{ marginTop: 40 }} />
            ) : selectableUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#666' }]}>
                  Sigue a otros usuarios desde el buscador para agregarlos a una lista de difusión.
                </Text>
              </View>
            ) : (
              <FlatList
                data={selectableUsers}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => {
                  const isSelected = selectedMemberIds.includes(item.uid);
                  return (
                    <TouchableOpacity
                      style={styles.userRow}
                      activeOpacity={0.7}
                      onPress={() => toggleMemberSelection(item.uid)}
                    >
                      {item.profilePicture ? (
                        <Image source={{ uri: item.profilePicture }} style={[styles.modalAvatarImage, { borderColor: isDark ? '#2A2A2A' : '#E0E0E0' }]} resizeMode="cover" />
                      ) : (
                        <View style={[styles.userAvatar, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0', overflow: 'hidden', borderColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                          <Ionicons name="person-circle-outline" size={46} color="#94BA46" style={{ marginLeft: -1, marginTop: -2 }} />
                        </View>
                      )}
                      <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={styles.userUsername}>@{item.username}</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isSelected ? '#9DBD3F' : (isDark ? '#666' : '#ccc')}
                      />
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}

            <TouchableOpacity
              onPress={handleCreateBroadcast}
              disabled={selectedMemberIds.length === 0 || !broadcastNameInput.trim()}
              style={{
                backgroundColor: (selectedMemberIds.length === 0 || !broadcastNameInput.trim()) ? (isDark ? '#333' : '#ddd') : v1,
                borderRadius: 24,
                paddingVertical: 14,
                alignItems: 'center',
                marginTop: 8,
                marginBottom: insets.bottom + 12
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontFamily: 'Nunito-Bold' }}>
                Crear lista{selectedMemberIds.length > 0 ? ` (${selectedMemberIds.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación propio de la app (borrado de chat) */}
      {confirmModal && (
        <Animated.View style={[styles.confirmOverlay, { opacity: confirmOpacity }]}>
          <TouchableWithoutFeedback onPress={() => closeConfirmModal()}>
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
            <Text style={[styles.confirmTitle, { color: colors.text }]}>{confirmModal.title}</Text>
            <Text style={[styles.confirmMessage, { color: isDark ? '#bbb' : '#555' }]}>{confirmModal.message}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                onPress={() => closeConfirmModal()}
                style={[styles.confirmBtn, { backgroundColor: isDark ? '#2C2C2C' : '#F2F2F2' }]}
              >
                <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => closeConfirmModal(confirmModal.onConfirm)}
                style={[styles.confirmBtn, { backgroundColor: '#a70d0d' }]}
              >
                <Ionicons name="trash" size={16} color="#FFF" />
                <Text style={[styles.confirmBtnText, { color: '#FFF' }]}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
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
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: -7, paddingBottom: 6, justifyContent: 'space-around' },
  filterTab: { flex: 1, alignItems: 'center' },
  filterText: { fontSize: 20, fontFamily: 'Nunito-Regular' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 18, marginBottom: 8, marginRight: 0, borderTopLeftRadius: 20, borderBottomLeftRadius: 20, paddingHorizontal: 14, height: 42 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontFamily: 'Nunito-Regular', fontSize: 16, paddingVertical: 0 },
  listContent: { paddingBottom: 20 },
  chatRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  avatarContainer: { marginRight: 12 },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarImage: { width: 52, height: 52, borderRadius: 26, borderWidth: 2 },
  modalAvatarImage: {width: 44,height: 44,borderRadius: 22,borderWidth: 1.5,marginRight: 12},
  chatDetails: { flex: 1, justifyContent: 'center' },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  chatName: { fontSize: 16, fontFamily: 'Nunito-Bold' },
  chatTime: { color: '#888', fontSize: 13, fontFamily: 'Nunito-Regular' },
  chatMessage: { fontSize: 14, fontFamily: 'Nunito-Regular' },
  fabButton: {position: 'absolute',bottom: 24,right: 24,width: 60,height: 60,borderRadius: 30,justifyContent: 'center',alignItems: 'center',elevation: 6,shadowColor: '#000',shadowOpacity: 0.25,shadowRadius: 3.84,shadowOffset: { width: 0, height: 2 },},
  modalOverlay: {flex: 1,backgroundColor: 'rgba(0, 0, 0, 0.5)',justifyContent: 'flex-end',},
  modalContent: {borderTopLeftRadius: 20,borderTopRightRadius: 20,height: '70%',paddingHorizontal: 16,paddingTop: 16,},
  modalHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',borderBottomWidth: 0.5,borderBottomColor: '#88888844',paddingBottom: 12,marginBottom: 8,},
  modalTitle: {fontSize: 20,fontFamily: 'Nunito-Bold',},
  emptyContainer: {flex: 1,justifyContent: 'center',alignItems: 'center',paddingHorizontal: 32,},
  emptyText: {fontSize: 16,fontFamily: 'Nunito-Regular',textAlign: 'center',lineHeight: 22,},
  userRow: {flexDirection: 'row',alignItems: 'center',paddingVertical: 12,borderBottomWidth: 0.5,borderBottomColor: '#88888822',},
  userAvatar: {width: 44,height: 44,borderRadius: 22,backgroundColor: '#9DBD3F',justifyContent: 'center',alignItems: 'center',marginRight: 12,},
  userInfo: {flex: 1,},
  userName: {fontSize: 16,fontFamily: 'Nunito-Bold',},
  userUsername: {fontSize: 14,color: '#888',fontFamily: 'Nunito-Regular',},
  managementOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, justifyContent: 'flex-end' },
  managementCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: -4 } },
  managementChatInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: '#88888844' },
  managementAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2 },
  managementAvatarCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  managementChatName: { fontSize: 18, fontFamily: 'Nunito-Bold', flex: 1 },
  managementChatUsername: { fontSize: 14, color: '#888', fontFamily: 'Nunito-Regular' },
  managementActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 4 },
  managementBtn: { alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4 },
  managementBtnText: { fontSize: 12, fontFamily: 'Nunito-Bold', textAlign: 'center' },
  confirmOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmCard: { width: '82%', borderRadius: 20, borderWidth: 1, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  confirmIconCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  confirmTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', marginBottom: 8, textAlign: 'center' },
  confirmMessage: { fontSize: 14, fontFamily: 'Nunito-Regular', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  confirmActions: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 24 },
  confirmBtnText: { fontSize: 15, fontFamily: 'Nunito-Bold' },
  groupToast: { position: 'absolute', bottom: 130, left: 16, right: 16, backgroundColor: '#323232', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5 },
  groupToastText: { color: '#FFF', fontSize: 14, fontFamily: 'Nunito-Bold' },
});