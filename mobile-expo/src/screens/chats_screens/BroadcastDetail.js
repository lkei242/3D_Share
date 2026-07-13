import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LogBox,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  TouchableWithoutFeedback,
  Alert,
  Animated,
  ActivityIndicator,
  Keyboard,
  Image,
  Modal,
  BackHandler,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { API_URL } from '../config/api';
import { deleteMediaFromCloudinary } from '../config/mediaHelper';
import {
  collection,
  doc,
  getDoc,
  addDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';

import { GREEN_ACCENT, SCREEN_WIDTH, SCREEN_HEIGHT, getMediaCategory, formatTime, canEditMessage } from './Chatconstants';
import styles from './Chatstyles';
import MessageItem from './Messageitem';
import MediaViewerModal from './Mediaviewer';
import useVoiceRecorder from './Usevoicerecorder';
import CustomCameraModal from '../components/CustomCameraModal';

const _warn = console.warn;
console.warn = (...args) => {
  const msg = args[0];
  if (
    typeof msg === 'string' && (
      msg.includes('Cannot record touch move without a touch start') ||
      msg.includes('Cannot record touch end without a touch start') ||
      msg.includes('Ended a touch event which was not counted in') ||
      msg.includes('trackedTouchCount')
    )
  ) return;
  _warn(...args);
};

export default function BroadcastDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colors.text === '#FFFFFF';

  const {
    broadcastId,
    name: initialName,
    recipients: initialRecipients,
  } = route.params;

  const [broadcastInfo, setBroadcastInfo] = useState({
    name: initialName || 'Lista de difusión',
    photo: '',
    recipients: initialRecipients || [],
    ownerId: '',
  });

  const [membersMap, setMembersMap] = useState({});
  const membersMapRef = useRef({});
  useEffect(() => { membersMapRef.current = membersMap; }, [membersMap]);
  const [currentUserPic, setCurrentUserPic] = useState('');

  const [sentMessages, setSentMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectableUsers, setSelectableUsers] = useState([]);
  const [fetchingSelectable, setFetchingSelectable] = useState(false);
  const [selectedNewIds, setSelectedNewIds] = useState([]);

  const [toastMessage, setToastMessage] = useState(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);

  const showToast = (message) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToastMessage(null));
    }, 2200);
  };

  
  const [selectedIds, setSelectedIds] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const textInputRef = useRef(null);

  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showCustomCamera, setShowCustomCamera] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteConfirmOpacity = useRef(new Animated.Value(0)).current;

  
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  const flatMediaItems = React.useMemo(() => {
    const result = [];
    sentMessages.forEach(m => {
      if (m.type === 'image' || m.type === 'video' || m.type === 'file') {
        result.push(m);
      } else if (m.type === 'media_group') {
        (m.mediaItems || []).forEach((mi, idx) => {
          result.push({
            id: `${m.id}_${idx}`,
            type: mi.type || 'image',
            mediaUrl: mi.url,
            text: mi.type === 'video' ? 'Video' : 'Imagen',
          });
        });
      }
    });
    return result;
  }, [sentMessages]);

  const openMediaViewer = useCallback((item, groupIdx = 0) => {
    if (item.type === 'media_group') {
      const firstId = `${item.id}_0`;
      const baseIdx = flatMediaItems.findIndex(m => m.id === firstId);
      setMediaViewerIndex(baseIdx >= 0 ? baseIdx + groupIdx : 0);
    } else {
      const idx = flatMediaItems.findIndex(m => m.id === item.id);
      setMediaViewerIndex(idx >= 0 ? idx : 0);
    }
    setMediaViewerVisible(true);
  }, [flatMediaItems]);

  const flatListRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    if (sentMessages.length > prevMessagesLengthRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
    }
    prevMessagesLengthRef.current = sentMessages.length;
  }, [sentMessages.length]);

  const activeMsg = selectedIds.length === 1 ? sentMessages.find(m => m.id === selectedIds[0]) : null;

  
  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;
      if (!user || !broadcastId) return;
      const userRef = doc(db, 'users', user.uid);
      setDoc(userRef, { activeChatId: `broadcast_${broadcastId}` }, { merge: true }).catch(() => {});
      return () => {
        setDoc(userRef, { activeChatId: null }, { merge: true }).catch(() => {});
      };
    }, [broadcastId])
  );

  
  useEffect(() => {
    if (!broadcastId) return;
    const ref = doc(db, 'broadcastLists', broadcastId);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        navigation.goBack();
        return;
      }
      const data = snap.data();
      setBroadcastInfo({
        name: data.name || initialName || 'Lista de difusión',
        photo: data.photo || '',
        recipients: data.recipients || [],
        ownerId: data.ownerId || '',
      });
    }, (err) => console.log('Error escuchando lista de difusión:', err));
    return unsubscribe;
  }, [broadcastId]);

  
  useEffect(() => {
    const uids = broadcastInfo.recipients || [];
    if (uids.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const entries = await Promise.all(uids.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, 'users', uid));
            if (snap.exists()) {
              const d = snap.data();
              let picUrl = d.profilePicture || '';
              if (picUrl.startsWith('http://')) {
                picUrl = picUrl.replace('http://', 'https://');
              }
              return [uid, { name: d.profileName || d.username || 'Usuario', username: d.username || '', profilePicture: picUrl }];
            }
          } catch (e) {  }
          return [uid, { name: 'Usuario', username: '', profilePicture: '' }];
        }));
        if (!cancelled) {
          setMembersMap(Object.fromEntries(entries.filter(([, v]) => v)));
          const me = auth.currentUser;
          const mine = entries.find(([uid]) => uid === me?.uid);
          if (mine && mine[1]) setCurrentUserPic(mine[1].profilePicture);
        }
      } catch (err) {
        console.log('Error cargando destinatarios:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [broadcastInfo.recipients]);

  const ensureChatId = async () => {
    if (broadcastId) return broadcastId;
    throw new Error('No se encontró la lista de difusión');
  };

  
  const onBroadcastAudioSave = useCallback(async (url, durationText) => {
    const user = auth.currentUser;
    if (!user) return;
    const recipients = broadcastInfo.recipients || [];
    
    await addDoc(collection(db, `broadcastLists/${broadcastId}/messages`), {
      text: 'Nota de voz',
      type: 'audio',
      mediaUrl: url,
      audioDuration: durationText,
      sender: user.uid,
      createdAt: serverTimestamp(),
      recipientsCount: recipients.length,
      isFavorite: false,
      read: false,
      delivered: false,
    });
    await updateDoc(doc(db, 'broadcastLists', broadcastId), {
      lastMessage: `🎙️ Nota de voz (${durationText})`,
      lastMessageTime: serverTimestamp(),
    });
    
    const results = await Promise.allSettled(recipients.map(async (uid) => {
      const chatId = await getOrCreateChatWithUser(uid);
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        text: 'Nota de voz',
        type: 'audio',
        mediaUrl: url,
        audioDuration: durationText,
        sender: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        delivered: false,
        isFavorite: false,
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: `🎙️ Nota de voz (${durationText})`,
        lastMessageTime: serverTimestamp(),
        lastSender: user.uid,
      });
    }));
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      showToast(`No se pudo enviar el audio a ${failed} de ${recipients.length} destinatarios`);
    }
  }, [broadcastId, broadcastInfo.recipients]);

  const {
    isLocked,
    isRecording,
    isPaused,
    recordSeconds,
    waveBarAnims,
    lockBounceAnim,
    lockSlideAnim,
    lockOpacityAnim,
    cancelSlideAnim,
    togglePauseRecording,
    stopAndSendRecording,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useVoiceRecorder(ensureChatId, onBroadcastAudioSave);

  
  const handleToggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      return [...prev, id];
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  
  const getOrCreateChatWithUser = async (otherUid) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const snap = await getDocs(q);
    const existing = snap.docs.find(d => {
      const data = d.data();
      return (data.participants || []).length === 2 && data.participants.includes(otherUid);
    });
    if (existing) {
      const deletedBy = existing.data().deletedBy || [];
      if (deletedBy.includes(user.uid)) {
        await updateDoc(existing.ref, { deletedBy: arrayRemove(user.uid) });
      }
      return existing.id;
    }
    const otherData = membersMapRef.current[otherUid] || {};
    const newChatRef = await addDoc(collection(db, 'chats'), {
      participants: [user.uid, otherUid],
      participantNames: [user.email || user.uid, otherData.name || 'Usuario'],
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      lastSender: user.uid,
      deletedBy: [],
    });
    return newChatRef.id;
  };

  
  const saveBroadcastMessage = async (messageData) => {
    const user = auth.currentUser;
    const recipients = broadcastInfo.recipients || [];
    const docRef = await addDoc(collection(db, `broadcastLists/${broadcastId}/messages`), {
      ...messageData,
      sender: user.uid,
      createdAt: serverTimestamp(),
      recipientsCount: recipients.length,
      read: false,
      delivered: false,
      isFavorite: false,
    });
    await updateDoc(doc(db, 'broadcastLists', broadcastId), {
      lastMessage: messageData.text || 'Mensaje',
      lastMessageTime: serverTimestamp(),
    });
    const results = await Promise.allSettled(recipients.map(async (uid) => {
      const chatId = await getOrCreateChatWithUser(uid);
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        ...messageData,
        sender: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        delivered: false,
        isFavorite: false,
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: messageData.text || 'Mensaje',
        lastMessageTime: serverTimestamp(),
        lastSender: user.uid,
      });
    }));
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      showToast(`No se pudo enviar a ${failed} de ${recipients.length} destinatarios`);
    }
    return docRef.id;
  };

  
  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend) return;
    setInputText('');
    setEditingMessageId(null);
    const replySnapshot = replyingTo;
    setReplyingTo(null);
    setSending(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      if (editingMessageId) {
        const msgRef = doc(db, `broadcastLists/${broadcastId}/messages/${editingMessageId}`);
        await updateDoc(msgRef, { text: textToSend, caption: textToSend });
      } else {
        await saveBroadcastMessage({
          text: textToSend,
          type: 'text',
          ...(replySnapshot ? {
            replyTo: {
              id: replySnapshot.id,
              text: replySnapshot.text || (replySnapshot.type && replySnapshot.type !== 'text' ? `📎 ${replySnapshot.type}` : ''),
              senderId: user.uid,
            },
          } : {}),
        });
      }
    } catch (err) {
      console.log('Error enviando mensaje:', err);
      showToast('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  
  const handleOpenCamera = async () => {
    setShowAttachmentMenu(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setMediaPreview({ assets: result.assets, caption: '' });
    }
  };

  const handleOpenGallery = async () => {
    setShowAttachmentMenu(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets?.length) {
      setMediaPreview({ assets: result.assets, caption: '' });
    }
  };

  const handleOpenFiles = async () => {
    setShowAttachmentMenu(false);
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const file = result.assets[0];
      await handleUploadAndSendMedia({
        uri: file.uri,
        type: file.mimeType || 'application/octet-stream',
        fileName: file.name,
      });
    }
  };

  const handleSendLocation = async () => {
    setShowAttachmentMenu(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { latitude, longitude } = loc.coords;
    const user = auth.currentUser;
    let locationName = 'Ubicación compartida';
    let locationAddress = '';
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (place) {
        locationName = place.name || place.street || 'Ubicación';
        locationAddress = [place.street, place.district, place.city].filter(Boolean).join(', ');
      }
    } catch (_) {}
    await saveBroadcastMessage({
      text: locationName,
      type: 'location',
      latitude,
      longitude,
      locationName,
      locationAddress,
    });
  };

  const handleUploadAndSendMedia = async (asset) => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const uri = asset.uri;
      const mimeType = asset.mimeType || asset.type || (uri.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
      const category = getMediaCategory(mimeType);
      const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = asset.fileName || asset.name || `media_${Date.now()}.${extension}`;
      const formData = new FormData();
      formData.append('imagen', { uri, type: mimeType, name: fileName });
      const xhr = new XMLHttpRequest();
      const uploadRes = await new Promise((resolve, reject) => {
        xhr.open('POST', `${API_URL}/api/media/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.onload = () => {
          let data = null;
          try { data = JSON.parse(xhr.responseText); } catch (e) {}
          resolve({ ok: xhr.status === 200, data });
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });
      if (!uploadRes.ok) {
        Alert.alert('Error', 'No se pudo subir el archivo.');
        return;
      }
      const uploadData = uploadRes.data;
      const labels = { image: ['Imagen', '🖼️ Imagen'], video: ['Video', '🎥 Video'], file: [fileName, `📎 ${fileName}`] };
      const [text, lastMessage] = labels[category] || ['Archivo', '📎 Archivo'];
      if (category === 'file') {
        await saveBroadcastMessage({
          text,
          type: 'file',
          mediaUrl: uploadData.url,
          fileName,
        });
      } else {
        await saveBroadcastMessage({
          text,
          type: category,
          mediaUrl: uploadData.url,
        });
      }
    } catch (err) {
      console.log('Error subiendo media:', err);
      Alert.alert('Error', 'No se pudo enviar el archivo.');
    }
  };

  const handleSendMediaPreview = async () => {
    if (!mediaPreview) return;
    const { assets, caption } = mediaPreview;
    setMediaPreview(null);
    const user = auth.currentUser;
    const token = await user.getIdToken();
    const uploaded = [];
    for (const asset of assets) {
      const uri = asset.uri;
      const mimeType = asset.mimeType || asset.type || (uri.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
      const category = getMediaCategory(mimeType);
      const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = asset.fileName || asset.name || `media_${Date.now()}.${extension}`;
      const formData = new FormData();
      formData.append('imagen', { uri, type: mimeType, name: fileName });
      const xhr = new XMLHttpRequest();
      const uploadRes = await new Promise((resolve, reject) => {
        xhr.open('POST', `${API_URL}/api/media/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.onload = () => {
          let data = null;
          try { data = JSON.parse(xhr.responseText); } catch (e) {}
          resolve({ ok: xhr.status === 200, data });
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });
      if (uploadRes.ok) {
        uploaded.push({ url: uploadRes.data.url, type: category });
      }
    }
    if (uploaded.length === 0) {
      Alert.alert('Error', 'No se pudo subir ningún archivo.');
      return;
    }
    if (uploaded.length === 1) {
      const { url, type } = uploaded[0];
      const labels = { image: ['Imagen', '🖼️ Imagen'], video: ['Video', '🎥 Video'] };
      const [text, lastMsg] = labels[type] || ['Archivo', '📎 Archivo'];
      await saveBroadcastMessage({
        text: caption || text,
        type,
        mediaUrl: url,
        caption: caption || null,
      });
    } else {
      await saveBroadcastMessage({
        text: caption || '📷 Fotos',
        type: 'media_group',
        mediaItems: uploaded,
        caption: caption || null,
      });
    }
  };

  const handleSendCustomMediaList = async (mediaList) => {
    setShowCustomCamera(false);
    if (!mediaList || mediaList.length === 0) return;
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const uploadedItems = await Promise.all(
        mediaList.map(async (item) => {
          const uri = item.uri;
          const extension = uri.split('.').pop()?.split('?')[0] || (item.type === 'video' ? 'mp4' : 'jpg');
          const type = item.type === 'video' ? 'video/mp4' : 'image/jpeg';
          const fileName = `media_${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;
          const formData = new FormData();
          formData.append('imagen', { uri, type, name: fileName });
          const xhr = new XMLHttpRequest();
          const uploadRes = await new Promise((resolve, reject) => {
            xhr.open('POST', `${API_URL}/api/media/upload`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.onload = () => {
              let data = null;
              try { data = JSON.parse(xhr.responseText); } catch (e) {}
              resolve({ ok: xhr.status === 200, data });
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(formData);
          });
          if (!uploadRes.ok || !uploadRes.data?.url) return null;
          return { url: uploadRes.data.url, type: item.type === 'video' ? 'video' : 'image' };
        })
      );
      const validItems = uploadedItems.filter(Boolean);
      if (validItems.length === 0) return;
      const caption = mediaList[0]?.caption || '';
      if (validItems.length === 1) {
        const single = validItems[0];
        const isVideo = single.type === 'video';
        await saveBroadcastMessage({
          text: caption || (isVideo ? 'Video' : 'Imagen'),
          caption: caption || null,
          type: isVideo ? 'video' : 'image',
          mediaUrl: single.url,
        });
      } else {
        await saveBroadcastMessage({
          text: caption || '🖼️ Multimedia',
          caption: caption || null,
          type: 'media_group',
          mediaItems: validItems,
        });
      }
    } catch (err) {
      console.log('Error enviando media personalizada:', err);
      Alert.alert('Error', 'No se pudo enviar el archivo.');
    }
  };

  
  const startReply = useCallback((msg) => {
    if (!msg) return;
    setEditingMessageId(null);
    setInputText('');
    setReplyingTo(msg);
    clearSelection();
    Keyboard.dismiss();
    setTimeout(() => textInputRef.current?.focus(), 150);
  }, [clearSelection]);

  const handleReply = () => startReply(activeMsg);

  const handleSwipeReply = useCallback((item) => startReply(item), [startReply]);

  const handleCancelReply = () => setReplyingTo(null);

  const handleCancelEdit = () => {
    Keyboard.dismiss();
    setEditingMessageId(null);
    setInputText('');
  };

  const handleStartEdit = () => {
    if (!activeMsg || activeMsg.sender !== 'me' || !canEditMessage(activeMsg)) return;
    setInputText(activeMsg.text);
    setEditingMessageId(activeMsg.id);
    setReplyingTo(null);
    clearSelection();
    setTimeout(() => {
      textInputRef.current?.focus();
      try { flatListRef.current?.scrollToItem({ item: activeMsg, animated: true, viewPosition: 0.5 }); } catch (_) {}
    }, 150);
  };

  
  const handleFavorite = async () => {
    if (selectedIds.length === 0) return;
    try {
      const firstMsg = sentMessages.find(m => m.id === selectedIds[0]);
      const newFav = !firstMsg?.isFavorite;
      await Promise.all(selectedIds.map(id => {
        const msgRef = doc(db, `broadcastLists/${broadcastId}/messages/${id}`);
        return updateDoc(msgRef, { isFavorite: newFav });
      }));
    } catch (error) {
      console.log('Error al marcar favorito:', error);
    }
    clearSelection();
  };

  
  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    setShowDeleteConfirm(true);
    Animated.timing(deleteConfirmOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const closeDeleteConfirm = (onClosed) => {
    Animated.timing(deleteConfirmOpacity, { toValue: 0, duration: 150, useNativeDriver: true })
      .start(() => {
        setShowDeleteConfirm(false);
        if (onClosed) onClosed();
      });
  };

  const handleConfirmDelete = () => {
    const idsToDelete = [...selectedIds];
    closeDeleteConfirm(async () => {
      clearSelection();
      try {
        const msgsToDelete = sentMessages.filter(m => idsToDelete.includes(m.id));
        await Promise.all(msgsToDelete.map(async (msg) => {
          const msgRef = doc(db, `broadcastLists/${broadcastId}/messages/${msg.id}`);
          try {
            if (msg?.mediaUrl) await deleteMediaFromCloudinary(msg.mediaUrl).catch(() => {});
            if (msg?.type === 'media_group' && msg.mediaItems) {
              await Promise.all(msg.mediaItems.map(item =>
                item.url ? deleteMediaFromCloudinary(item.url).catch(() => {}) : Promise.resolve()
              ));
            }
          } catch (e) {}
          await deleteDoc(msgRef);
        }));
      } catch (error) {
        console.log('Error al borrar mensajes:', error);
      }
    });
  };

  const handleCancelDelete = () => closeDeleteConfirm();

  const handleExitSelection = () => {
    if (showDeleteConfirm) {
      closeDeleteConfirm(clearSelection);
    } else {
      clearSelection();
    }
  };

  
  const handleCopy = async () => {
    if (!activeMsg?.text) return;
    clearSelection();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage('Mensaje copiado al portapapeles');
    Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start(() => {
      setTimeout(() => { Clipboard.setStringAsync(activeMsg.text); }, 1000);
    });
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setToastMessage(null));
    }, 900);
  };

  
  const closeAllMenus = () => {
    setShowAttachmentMenu(false);
  };

  
  useEffect(() => {
    if (!broadcastId) return;
    const q = query(collection(db, `broadcastLists/${broadcastId}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, async (snapshot) => {
      const msgs = snapshot.docs
        .filter(docSnapshot => {
          const data = docSnapshot.data();
          return !(data.deletedFor || []).includes(auth.currentUser?.uid);
        })
        .map(docSnapshot => {
          const data = docSnapshot.data();
          const date = data.createdAt ? data.createdAt.toDate() : new Date();
          const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            id: docSnapshot.id,
            text: data.text,
            type: data.type || 'text',
            mediaUrl: data.mediaUrl || null,
            audioDuration: data.audioDuration || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            locationName: data.locationName || null,
            locationAddress: data.locationAddress || null,
            mediaItems: data.mediaItems || null,
            caption: data.caption || null,
            replyTo: data.replyTo ? {
              ...data.replyTo,
              senderName: 'Tú',
            } : null,
            sender: 'me',
            rawSender: data.sender,
            senderName: 'Tú',
            time: timeString,
            rawTime: data.createdAt || null,
            read: data.read || false,
            delivered: data.delivered || false,
            isFavorite: data.isFavorite || false,
            pending: docSnapshot.metadata.hasPendingWrites,
            recipientsCount: data.recipientsCount || 0,
          };
        });
      setSentMessages(msgs);
      setLoading(false);
      
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        let lastMsgText = lastMsg.text || '';
        if (lastMsg.type === 'image') lastMsgText = '🖼️ Imagen';
        else if (lastMsg.type === 'video') lastMsgText = '🎥 Video';
        else if (lastMsg.type === 'audio') lastMsgText = '🎙️ Audio';
        else if (lastMsg.type === 'location') lastMsgText = '📍 Ubicación compartida';
        else if (lastMsg.type === 'file') lastMsgText = `📎 ${lastMsg.text || 'Archivo'}`;
        else if (lastMsg.type === 'media_group') lastMsgText = `🖼️ ${(lastMsg.mediaItems || []).length} archivos`;
        try {
          await updateDoc(doc(db, 'broadcastLists', broadcastId), {
            lastMessage: lastMsgText,
            lastMessageTime: lastMsg.rawTime || serverTimestamp(),
            lastSender: auth.currentUser?.uid,
          });
        } catch (err) {}
      } else {
        try {
          await updateDoc(doc(db, 'broadcastLists', broadcastId), {
            lastMessage: 'Sin mensajes aún',
            lastMessageTime: serverTimestamp(),
            lastSender: '',
          });
        } catch (err) {}
      }
    }, (err) => { console.log('Error escuchando historial de difusión:', err); setLoading(false); });
    return unsubscribe;
  }, [broadcastId]);

  
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  
  useEffect(() => {
    const onBackPress = () => {
      if (editingMessageId) { handleCancelEdit(); return true; }
      if (selectedIds.length > 0) { handleExitSelection(); return true; }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [editingMessageId, selectedIds, showDeleteConfirm]);

  
  const renderMessageItem = React.useCallback(({ item }) => {
    return (
      <MessageItem
        item={item}
        isMe={true}
        isDark={isDark}
        colors={colors}
        chatName={broadcastInfo.name}
        isChecked={selectedIds.includes(item.id)}
        isEditing={item.id === editingMessageId}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        setShowMsgInfo={() => {}}
        onOpenMedia={openMediaViewer}
        onSwipeReply={handleSwipeReply}
        otherProfilePicture=""
        myProfilePicture={currentUserPic}
      />
    );
  }, [selectedIds, isDark, colors, broadcastInfo.name, openMediaViewer, handleSwipeReply, currentUserPic, editingMessageId]);

  
  const fetchSelectableUsers = async () => {
    setFetchingSelectable(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'followers'), where('followerId', '==', user.uid));
      const snap = await getDocs(q);
      const currentRecipients = broadcastInfo.recipients || [];
      const candidates = await Promise.all(
        snap.docs
          .map(d => d.data().userId)
          .filter(uid => uid && !currentRecipients.includes(uid))
          .map(async (uid) => {
            const uSnap = await getDoc(doc(db, 'users', uid));
            if (!uSnap.exists()) return null;
            const d = uSnap.data();
            let picUrl = d.profilePicture || '';
            if (picUrl.startsWith('http://')) picUrl = picUrl.replace('http://', 'https://');
            return { uid, name: d.profileName || d.username || 'Usuario', username: d.username || '', profilePicture: picUrl };
          })
      );
      setSelectableUsers(candidates.filter(Boolean));
    } catch (err) {
      console.log('Error cargando seguidos para agregar:', err);
    } finally {
      setFetchingSelectable(false);
    }
  };

  const openAddModal = () => {
    setSelectedNewIds([]);
    setShowAddModal(true);
    fetchSelectableUsers();
  };

  const toggleNewSelection = (uid) => {
    setSelectedNewIds(prev => prev.includes(uid) ? prev.filter(i => i !== uid) : [...prev, uid]);
  };

  const handleAddRecipients = async () => {
    if (selectedNewIds.length === 0) return;
    try {
      await updateDoc(doc(db, 'broadcastLists', broadcastId), {
        recipients: arrayUnion(...selectedNewIds),
      });
      setShowAddModal(false);
    } catch (err) {
      console.log('Error agregando destinatarios:', err);
    }
  };

  const handleRemoveRecipient = async (uid) => {
    try {
      await updateDoc(doc(db, 'broadcastLists', broadcastId), {
        recipients: arrayRemove(uid),
      });
    } catch (err) {
      console.log('Error quitando destinatario:', err);
    }
  };

  const handleDeleteBroadcast = async () => {
    try {
      await deleteDoc(doc(db, 'broadcastLists', broadcastId));
      navigation.goBack();
    } catch (err) {
      console.log('Error eliminando lista de difusión:', err);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={closeAllMenus}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {}
          {selectedIds.length > 0 ? (
            <View style={[styles.toolHeader, { backgroundColor: isDark ? '#1C1C1C' : '#E0EAE0', paddingTop: insets.top + 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={handleExitSelection} style={{ paddingRight: 12 }}>
                  <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerName, { color: colors.text, fontSize: 20 }]}>
                  {selectedIds.length}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {selectedIds.length === 1 && (
                  <TouchableOpacity style={styles.toolIcon} onPress={handleStartEdit}>
                    <Ionicons name="pencil" size={28} color={colors.text} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.toolIcon} onPress={handleDelete}>
                  <Ionicons name="trash" size={28} color="#a70d0d" />
                </TouchableOpacity>
                {selectedIds.length === 1 && activeMsg?.text ? (
                  <TouchableOpacity style={styles.toolIcon} onPress={handleCopy}>
                    <Ionicons name="copy" size={28} color={colors.text} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={[styles.header, { backgroundColor: isDark ? '#0B0B0B' : '#F5F5F5', paddingTop: insets.top + 8 }]}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 8 }}>
                  <Ionicons name="arrow-back" size={26} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => setShowInfoModal(true)} activeOpacity={0.7}>
                  <View style={[styles.avatarCircle, { borderColor: isDark ? '#333' : '#eee', marginRight: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
                    <Ionicons name="megaphone-outline" size={20} color="#FFF" />
                  </View>
                  <View>
                    <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>{broadcastInfo.name}</Text>
                    <Text style={styles.headerSubtitle}>{(broadcastInfo.recipients || []).length} destinatarios</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {}
          {loading ? (
            <ActivityIndicator size="large" color={GREEN_ACCENT} style={{ flex: 1 }} />
          ) : sentMessages.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
              <Ionicons name="megaphone-outline" size={48} color={isDark ? '#444' : '#ccc'} />
              <Text style={{ marginTop: 12, fontSize: 14, fontFamily: 'Nunito-Regular', color: isDark ? '#888' : '#777', textAlign: 'center', lineHeight: 20 }}>
                Los mensajes que envíes acá le van a llegar como mensaje privado, uno por uno, a cada destinatario. Ellos no ven esta lista.
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <FlatList
                ref={flatListRef}
                data={sentMessages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessageItem}
                extraData={membersMap}
                contentContainerStyle={styles.messagesList}
                removeClippedSubviews={true}
                maxToRenderPerBatch={15}
                windowSize={10}
                initialNumToRender={20}
                style={{ flex: 1 }}
              />
              {!!editingMessageId && (
                <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
              )}
            </View>
          )}

          {}
          {}
          {showAttachmentMenu && (
            <View style={[styles.attachmentTray, { backgroundColor: isDark ? '#1C1C1C' : '#FFF', borderColor: colors.border, bottom: Math.max(keyboardHeight + 60, insets.bottom + 10) + 58 }]}>
              <TouchableOpacity style={styles.attachmentItem} onPress={() => { setShowAttachmentMenu(false); setShowCustomCamera(true); }}>
                <Ionicons name="camera" size={27} color={GREEN_ACCENT} />
                <Text style={[styles.attachmentText, { color: colors.text }]}>Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentItem} onPress={handleOpenGallery}>
                <Ionicons name="images" size={27} color={GREEN_ACCENT} />
                <Text style={[styles.attachmentText, { color: colors.text }]}>Galería</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentItem} onPress={handleOpenFiles}>
                <Ionicons name="document-text" size={27} color={GREEN_ACCENT} />
                <Text style={[styles.attachmentText, { color: colors.text }]}>Archivos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentItem} onPress={handleSendLocation}>
                <Ionicons name="location" size={27} color={GREEN_ACCENT} />
                <Text style={[styles.attachmentText, { color: colors.text }]}>Ubicación</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentItem} onPress={() => { setShowAttachmentMenu(false); setShowInfoModal(true); }}>
                <Ionicons name="megaphone" size={27} color={GREEN_ACCENT} />
                <Text style={[styles.attachmentText, { color: colors.text }]}>Info lista</Text>
              </TouchableOpacity>
            </View>
          )}

          {isLocked ? (
            <Animated.View style={[styles.lockedRecordContainer, {
              backgroundColor: isDark ? '#1C1C1C' : '#F2F2F2',
              borderColor: isDark ? '#2C2C2C' : '#E0E0E0',
              bottom: Math.max(keyboardHeight + 60, insets.bottom + 10),
              transform: [{ translateY: lockSlideAnim }],
              opacity: lockOpacityAnim,
            }]}>
              <View style={styles.recordTopRow}>
                <Text style={[styles.recordSeconds, { color: colors.text }]}>{formatTime(recordSeconds)}</Text>
                <View style={styles.waveformContainer}>
                  {waveBarAnims.map((anim, i) => (
                    <Animated.View key={i} style={[styles.waveBar, { backgroundColor: isPaused ? '#888' : GREEN_ACCENT, transform: [{ scaleY: anim }] }]} />
                  ))}
                </View>
              </View>
              <View style={styles.recordActionRow}>
                <TouchableOpacity onPress={() => stopAndSendRecording(true)} style={[styles.recordDiscardButton, { backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.10)' }]}>
                  <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
                <TouchableOpacity onPress={togglePauseRecording} style={[styles.recordPausePill, { backgroundColor: isDark ? '#2C2C2C' : '#E4E4E4' }]}>
                  <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color={colors.text} />
                  <Text style={[styles.recordPauseLabel, { color: colors.text }]}>{isPaused ? 'Reanudar' : 'Pausar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => stopAndSendRecording(false)} style={[styles.recordSendButton, { backgroundColor: GREEN_ACCENT }]}>
                  <Feather name="arrow-up" size={28} color="#FFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            <>
              {!!editingMessageId && (
                <View style={[styles.replyPreviewBar, { backgroundColor: isDark ? '#1C1C1C' : '#F2F2F2' }]}>
                  <View style={styles.replyPreviewAccent} />
                  <View style={styles.replyPreviewTextWrap}>
                    <Text style={styles.replyPreviewTitle} numberOfLines={1}>Editando mensaje</Text>
                    <Text style={[styles.replyPreviewText, { color: colors.text }]} numberOfLines={1}>{inputText}</Text>
                  </View>
                  <TouchableOpacity onPress={handleCancelEdit} style={styles.replyPreviewCloseBtn}>
                    <Ionicons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              )}

              {!!replyingTo && (
                <View style={[styles.replyPreviewBar, { backgroundColor: isDark ? '#1C1C1C' : '#F2F2F2' }]}>
                  <View style={styles.replyPreviewAccent} />
                  <View style={styles.replyPreviewTextWrap}>
                    <Text style={styles.replyPreviewTitle} numberOfLines={1}>Tú</Text>
                    <Text style={[styles.replyPreviewText, { color: colors.text }]} numberOfLines={1}>
                      {replyingTo.text || (replyingTo.type && replyingTo.type !== 'text' ? `📎 ${replyingTo.type}` : '')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleCancelReply} style={styles.replyPreviewCloseBtn}>
                    <Ionicons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.inputContainer, { paddingBottom: Math.max(keyboardHeight + 60, insets.bottom + 10) }]}>
                {isRecording ? (
                  <Animated.View style={[styles.recordHintBar, { backgroundColor: isDark ? '#1C1C1C' : '#F2F2F2', transform: [{ translateX: cancelSlideAnim }] }]}>
                    <Text style={[styles.recordSeconds, { color: colors.text }]}>{formatTime(recordSeconds)}</Text>
                    <View style={styles.cancelHintRow}>
                      <Ionicons name="chevron-back" size={16} color={isDark ? '#999' : '#777'} />
                      <Text style={[styles.cancelHintText, { color: isDark ? '#999' : '#777' }]}>Desliza para cancelar</Text>
                    </View>
                  </Animated.View>
                ) : (
                  <View style={[styles.textInputWrapper, { backgroundColor: isDark ? '#1E1E1E' : '#F0F0F0' }]}>
                    <TouchableOpacity onPress={() => setShowCustomCamera(true)}>
                      <Ionicons name="camera-outline" size={24} color={GREEN_ACCENT} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                    <TextInput
                      ref={textInputRef}
                      placeholder={editingMessageId ? 'Editar mensaje...' : 'Mensaje para difundir...'}
                      placeholderTextColor={isDark ? '#777' : '#999'}
                      value={inputText}
                      onChangeText={setInputText}
                      style={[styles.textInput, { color: colors.text }]}
                      multiline
                    />
                    <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowAttachmentMenu(!showAttachmentMenu); }}>
                      <Feather name="paperclip" size={20} color={GREEN_ACCENT} style={{ marginRight: 8 }} />
                    </TouchableOpacity>
                  </View>
                )}

                {!isRecording && inputText.trim().length > 0 ? (
                  <TouchableOpacity onPress={handleSend} style={[styles.actionButton, { backgroundColor: GREEN_ACCENT, opacity: sending ? 0.6 : 1 }]} disabled={sending}>
                    {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name="arrow-up" size={28} color="#FFF" />}
                  </TouchableOpacity>
                ) : (
                  <View style={{ position: 'relative' }}>
                    {isRecording && (
                      <Animated.View pointerEvents="none" style={[styles.lockIndicator, { backgroundColor: isDark ? '#1C1C1C' : '#F2F2F2', transform: [{ translateY: lockBounceAnim }] }]}>
                        <Ionicons name="lock-closed" size={15} color={GREEN_ACCENT} />
                        <Ionicons name="chevron-up" size={13} color={GREEN_ACCENT} style={{ marginTop: 2 }} />
                      </Animated.View>
                    )}
                    <View
                      onTouchStart={mediaViewerVisible ? undefined : handleTouchStart}
                      onTouchMove={mediaViewerVisible ? undefined : handleTouchMove}
                      onTouchEnd={mediaViewerVisible ? undefined : handleTouchEnd}
                      style={[styles.actionButton, { backgroundColor: GREEN_ACCENT }, isRecording && styles.actionButtonRecording]}
                    >
                      <Ionicons name="mic" size={24} color="#FFF" />
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

          <CustomCameraModal
            visible={showCustomCamera}
            onClose={() => setShowCustomCamera(false)}
            onSend={handleSendCustomMediaList}
            username={broadcastInfo.name}
          />
        </View>
      </TouchableWithoutFeedback>

      {}
      {toastMessage && (
        <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastOpacity }]}>
          <Ionicons name="checkmark-circle" size={18} color="#FFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {}
      {showDeleteConfirm && (
        <Animated.View style={[styles.deleteConfirm, {
          opacity: deleteConfirmOpacity,
          backgroundColor: isDark ? '#1C1C1C' : '#FFF',
          borderColor: colors.border,
          bottom: Math.max(keyboardHeight + 60, insets.bottom + 10) + 100,
        }]}>
          <Text style={[styles.deleteConfirmText, { color: colors.text }]}>
            ¿Deseas eliminar {selectedIds.length > 1 ? 'estos ' + selectedIds.length + ' mensajes' : 'este mensaje'}?
          </Text>
          <View style={styles.deleteConfirmActions}>
            <TouchableOpacity onPress={handleCancelDelete} style={[styles.deleteConfirmBtn, { backgroundColor: isDark ? '#2C2C2C' : '#F2F2F2' }]}>
              <Text style={[styles.deleteConfirmBtnText, { color: colors.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirmDelete} style={[styles.deleteConfirmBtn, { backgroundColor: '#a70d0d' }]}>
              <Ionicons name="trash" size={18} color="#FFF" />
              <Text style={[styles.deleteConfirmBtnText, { color: '#FFF', fontWeight: 'bold' }]}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {}
      <Modal visible={!!mediaPreview} animationType="slide" transparent={false} onRequestClose={() => setMediaPreview(null)}>
        <View style={{ flex: 1, backgroundColor: '#111' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 12 }}>
            <TouchableOpacity onPress={() => setMediaPreview(null)}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={{ color: '#FFF', fontSize: 16, fontFamily: 'Nunito-Bold' }}>
              {mediaPreview?.assets?.length > 1 ? `${mediaPreview.assets.length} elementos` : 'Vista previa'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <FlatList
            data={mediaPreview?.assets || []}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={({ item: asset }) => {
              const isVideo = (asset.mimeType || asset.type || '').startsWith('video');
              return (
                <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.62, justifyContent: 'center', alignItems: 'center' }}>
                  <Image source={{ uri: asset.uri }} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.62 }} resizeMode="contain" />
                  {isVideo && (
                    <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.85)" />
                    </View>
                  )}
                </View>
              );
            }}
          />

          {(mediaPreview?.assets?.length || 0) > 1 && (
            <FlatList
              data={mediaPreview?.assets || []}
              keyExtractor={(_, i) => `th-${i}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingVertical: 8 }}
              renderItem={({ item: asset }) => (
                <Image source={{ uri: asset.uri }} style={{ width: 56, height: 56, borderRadius: 8, borderWidth: 1.5, borderColor: GREEN_ACCENT }} resizeMode="cover" />
              )}
            />
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: Math.max(insets.bottom + 8, 16), paddingTop: 8, gap: 10, backgroundColor: '#1A1A1A' }}>
            <TextInput
              placeholder="Agregar un comentario..."
              placeholderTextColor="#888"
              value={mediaPreview?.caption || ''}
              onChangeText={(t) => setMediaPreview(prev => ({ ...prev, caption: t }))}
              style={{ flex: 1, color: '#FFF', fontSize: 15, fontFamily: 'Nunito-Regular', backgroundColor: '#2C2C2C', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100 }}
              multiline
            />
            <TouchableOpacity onPress={handleSendMediaPreview} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: GREEN_ACCENT, justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="arrow-up" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={showInfoModal} animationType="slide" transparent onRequestClose={() => setShowInfoModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', paddingBottom: insets.bottom }}>
          <View style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: '#88888844', paddingBottom: 12, marginBottom: 8 }}>
              <Text style={{ fontSize: 20, fontFamily: 'Nunito-Bold', color: colors.text }}>{broadcastInfo.name}</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => { setShowInfoModal(false); openAddModal(); }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}
            >
              <Ionicons name="person-add-outline" size={22} color={GREEN_ACCENT} />
              <Text style={{ fontSize: 15, fontFamily: 'Nunito-Bold', color: GREEN_ACCENT }}>Agregar destinatarios</Text>
            </TouchableOpacity>

            <FlatList
              data={broadcastInfo.recipients || []}
              keyExtractor={(uid) => uid}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
              renderItem={({ item: uid }) => {
                const member = membersMap[uid];
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 12 }}>
                      {member?.profilePicture ? (
                        <Image source={{ uri: member.profilePicture }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Ionicons name="person-circle-outline" size={38} color="#94BA46" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontFamily: 'Nunito-Bold', color: colors.text }} numberOfLines={1}>{member?.name || 'Usuario'}</Text>
                      {!!member?.username && (
                        <Text style={{ fontSize: 12, fontFamily: 'Nunito-Regular', color: isDark ? '#888' : '#777' }} numberOfLines={1}>@{member.username}</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveRecipient(uid)} style={{ paddingLeft: 8 }}>
                      <Ionicons name="remove-circle-outline" size={26} color="#a70d0d" />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />

            <TouchableOpacity
              onPress={handleDeleteBroadcast}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginHorizontal: 16, marginBottom: Math.max(insets.bottom, 16), borderRadius: 12, backgroundColor: isDark ? '#2C1414' : '#FBE9E9' }}
            >
              <Ionicons name="trash-outline" size={20} color="#a70d0d" />
              <Text style={{ fontSize: 15, fontFamily: 'Nunito-Bold', color: '#a70d0d' }}>Eliminar lista de difusión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '70%', paddingHorizontal: 16, paddingTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#88888844', paddingBottom: 12, marginBottom: 8 }}>
              <Text style={{ fontSize: 20, fontFamily: 'Nunito-Bold', color: colors.text }}>Agregar destinatarios</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            {fetchingSelectable ? (
              <ActivityIndicator size="large" color={GREEN_ACCENT} style={{ marginTop: 40 }} />
            ) : selectableUsers.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 16, fontFamily: 'Nunito-Regular', color: isDark ? '#aaa' : '#666', textAlign: 'center', lineHeight: 22 }}>
                  No tenés seguidos disponibles para agregar (o ya forman parte de la lista).
                </Text>
              </View>
            ) : (
              <FlatList
                data={selectableUsers}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => {
                  const isSelected = selectedNewIds.includes(item.uid);
                  return (
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#88888822' }}
                      activeOpacity={0.7}
                      onPress={() => toggleNewSelection(item.uid)}
                    >
                      {item.profilePicture ? (
                        <Image source={{ uri: item.profilePicture }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: isDark ? '#2A2A2A' : '#E0E0E0', marginRight: 12 }} resizeMode="cover" />
                      ) : (
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 12 }}>
                          <Ionicons name="person-circle-outline" size={46} color="#94BA46" style={{ marginLeft: -1, marginTop: -2 }} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontFamily: 'Nunito-Bold', color: colors.text }}>{item.name}</Text>
                        <Text style={{ fontSize: 14, color: '#888', fontFamily: 'Nunito-Regular' }}>@{item.username}</Text>
                      </View>
                      <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={22} color={isSelected ? '#9DBD3F' : (isDark ? '#666' : '#ccc')} />
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}

            <TouchableOpacity
              onPress={handleAddRecipients}
              disabled={selectedNewIds.length === 0}
              style={{ backgroundColor: selectedNewIds.length === 0 ? (isDark ? '#333' : '#ddd') : GREEN_ACCENT, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: insets.bottom + 12 }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontFamily: 'Nunito-Bold' }}>
                Agregar{selectedNewIds.length > 0 ? ` (${selectedNewIds.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {}
      <MediaViewerModal
        visible={mediaViewerVisible}
        items={flatMediaItems}
        initialIndex={mediaViewerIndex}
        onClose={() => setMediaViewerVisible(false)}
      />
    </View>
  );
}