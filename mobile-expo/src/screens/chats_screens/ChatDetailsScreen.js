import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { API_URL } from '../config/api';
import { deleteMediaFromCloudinary } from '../config/mediaHelper';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';

import { GREEN_ACCENT, SCREEN_WIDTH, SCREEN_HEIGHT, getMediaCategory, formatTime } from './Chatconstants';
import styles from './Chatstyles';
import MessageItem from './Messageitem';
import MediaViewerModal from './Mediaviewer';
import useVoiceRecorder from './Usevoicerecorder';
import CustomCameraModal from '../components/CustomCameraModal';

export default function ChatDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colors.text === '#FFFFFF';
  
  const { chatId, name: chatName } = route.params;

  const [messages, setMessages] = useState([]);
  const [showCustomCamera, setShowCustomCamera] = useState(false);

  // --- Visor de media a pantalla completa ---
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const mediaMessages = React.useMemo(
    () => messages.filter(m => ['image', 'video', 'file', 'media_group'].includes(m.type)),
    [messages]
  );
  const openMediaViewer = useCallback((item) => {
    const idx = mediaMessages.findIndex(m => m.id === item.id);
    setMediaViewerIndex(idx >= 0 ? idx : 0);
    setMediaViewerVisible(true);
  }, [mediaMessages]);

  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showMoreSubMenu, setShowMoreSubMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showMsgInfo, setShowMsgInfo] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteConfirmOpacity = useRef(new Animated.Value(0)).current;

  // --- Grabación de notas de voz (estado, animaciones, gestos y envío) ---
  // Todo lo relacionado a grabar audio vive ahora en este hook; acá solo
  // desestructuramos con los MISMOS nombres que usaba el código original
  // para no tener que tocar el JSX de más abajo.
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
  } = useVoiceRecorder(chatId);

  const handleToggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      return [...prev, id];
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const flatListRef = useRef(null);
  const activeMsg = selectedIds.length === 1 ? messages.find(m => m.id === selectedIds[0]) : null;

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
          type: data.type || 'text',
          mediaUrl: data.mediaUrl || null,
          audioDuration: data.audioDuration || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          locationName: data.locationName || null,
          locationAddress: data.locationAddress || null,
          mediaItems: data.mediaItems || null,
          caption: data.caption || null,
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
    const textToSend = inputText.trim();
    if (textToSend === '') return;

    // 1. Limpiar input INMEDIATAMENTE para feedback instantáneo
    setInputText('');
    setEditingMessageId(null); // También resetear edición si aplica

    try {
      const user = auth.currentUser;
      if (!user) return;

      if (editingMessageId) {
        // Guardar edición
        const msgRef = doc(db, `chats/${chatId}/messages/${editingMessageId}`);
        await updateDoc(msgRef, { text: textToSend });
      } else {
        // Enviar nuevo - operaciones en paralelo para máxima velocidad
        const messagesRef = collection(db, `chats/${chatId}/messages`);
        const chatRef = doc(db, `chats/${chatId}`);

        // Ejecutar ambas escrituras en paralelo
        await Promise.all([
          addDoc(messagesRef, {
            text: textToSend,
            sender: user.uid,
            createdAt: serverTimestamp(),
            read: false,
            isFavorite: false
          }),
          updateDoc(chatRef, {
            lastMessage: textToSend,
            lastMessageTime: serverTimestamp(),
            lastSender: user.uid
          })
        ]);
      }
    } catch (error) {
      console.log("Error al enviar mensaje:", error);
      // Opcional: restaurar el texto si falla
      // setInputText(textToSend);
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

  const handleSendMediaPreview = async () => {
  if (!mediaPreview) return;
  const { assets, caption } = mediaPreview;
  setMediaPreview(null);

  const user = auth.currentUser;
  const token = await user.getIdToken();

  // Subir todos los assets
  const uploaded = [];
  for (const asset of assets) {
    const uri = asset.uri;
    const mimeType = asset.mimeType || asset.type || (uri.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
    const category = getMediaCategory(mimeType);
    const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = asset.fileName || asset.name || `media_${Date.now()}.${extension}`;

    const formData = new FormData();
    formData.append('imagen', { uri, type: mimeType, name: fileName });

    const uploadRes = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
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

  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const chatRef = doc(db, `chats/${chatId}`);

  if (uploaded.length === 1) {
    // Mensaje individual (igual que antes)
    const { url, type } = uploaded[0];
    const labels = { image: ['Imagen', '🖼️ Imagen'], video: ['Video', '🎥 Video'] };
    const [text, lastMsg] = labels[type] || ['Archivo', '📎 Archivo'];
    await Promise.all([
      addDoc(messagesRef, {
        text: caption || text,
        type,
        mediaUrl: url,
        caption: caption || null,
        sender: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        isFavorite: false,
      }),
      updateDoc(chatRef, {
        lastMessage: caption || lastMsg,
        lastMessageTime: serverTimestamp(),
        lastSender: user.uid,
      }),
    ]);
  } else {
    // Mensaje grupo de medias
    await Promise.all([
      addDoc(messagesRef, {
        text: caption || '📷 Fotos',
        type: 'media_group',
        mediaItems: uploaded, // [{ url, type }]
        caption: caption || null,
        sender: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        isFavorite: false,
      }),
      updateDoc(chatRef, {
        lastMessage: caption || `📷 ${uploaded.length} fotos`,
        lastMessageTime: serverTimestamp(),
        lastSender: user.uid,
      }),
    ]);
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
    const token = await user.getIdToken();
// Obtener nombre del lugar (geocoding inverso)
  let locationName = 'Ubicación compartida';
  let locationAddress = '';
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (place) {
      locationName = place.name || place.street || 'Ubicación';
      locationAddress = [place.street, place.district, place.city]
        .filter(Boolean).join(', ');
    }
  } catch (_) {}

  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const chatRef = doc(db, `chats/${chatId}`);
  await Promise.all([
    addDoc(messagesRef, {
      text: locationName,
      type: 'location',
      latitude,
      longitude,
      locationName,
      locationAddress,
      sender: user.uid,
      createdAt: serverTimestamp(),
      read: false,
      isFavorite: false,
    }),
    updateDoc(chatRef, {
      lastMessage: '📍 Ubicación compartida',
      lastMessageTime: serverTimestamp(),
      lastSender: user.uid,
    }),
  ]);
};

  // Handler genérico que sube a Cloudinary y manda el mensaje
  const handleUploadAndSendMedia = async (asset) => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const uri = asset.uri;

      // asset.type del ImagePicker solo trae la categoría ("image"/"video"), no
      // un MIME real. Priorizamos mimeType (ImagePicker y DocumentPicker lo traen).
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
          try {
            data = JSON.parse(xhr.responseText);
          } catch (e) {}
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
      const [text, lastMessage] = labels[category];

      const messagesRef = collection(db, `chats/${chatId}/messages`);
      const chatRef = doc(db, `chats/${chatId}`);
      await Promise.all([
        addDoc(messagesRef, {
          text,
          type: category,
          mediaUrl: uploadData.url,
          fileName: category === 'file' ? fileName : null,
          sender: user.uid,
          createdAt: serverTimestamp(),
          read: false,
          isFavorite: false,
        }),
        updateDoc(chatRef, {
          lastMessage,
          lastMessageTime: serverTimestamp(),
          lastSender: user.uid,
        }),
      ]);
    } catch (err) {
      console.log('Error subiendo media:', err);
      Alert.alert('Error', 'No se pudo enviar el archivo.');
    }
  };

    const handleSendCustomMediaList = async (mediaList) => {
    setShowCustomCamera(false);
    for (const item of mediaList) {
      try {
        const user = auth.currentUser;
        const token = await user.getIdToken();
        const uri = item.uri;
        
        // Obtenemos extensión y mimeType correctos
        const extension = uri.split('.').pop() || (item.type === 'video' ? 'mp4' : 'jpg');
        const type = item.type === 'video' ? 'video/mp4' : 'image/jpeg';
        const fileName = `media_${Date.now()}.${extension}`;
        const formData = new FormData();
        formData.append('imagen', { uri, type, name: fileName });
        // Subir a Cloudinary
        const xhr = new XMLHttpRequest();
        const uploadRes = await new Promise((resolve, reject) => {
          xhr.open('POST', `${API_URL}/api/media/upload`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.onload = () => {
            let data = null;
            try { data = JSON.parse(xhr.responseText); } catch(e) {}
            resolve({ ok: xhr.status === 200, data });
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(formData);
        });
        if (uploadRes.ok && uploadRes.data?.url) {
          const isVideo = item.type === 'video';
          const messagesRef = collection(db, `chats/${chatId}/messages`);
          const chatRef = doc(db, `chats/${chatId}`);
          
          // Enviamos la imagen/video con su respectivo comentario en el campo 'text'
          await Promise.all([
            addDoc(messagesRef, {
              text: item.caption || (isVideo ? 'Video' : 'Imagen'),
              type: isVideo ? 'video' : 'image',
              mediaUrl: uploadRes.data.url,
              sender: user.uid,
              createdAt: serverTimestamp(),
              read: false,
              isFavorite: false,
            }),
            updateDoc(chatRef, {
              lastMessage: isVideo ? '🎥 Video' : '🖼️ Imagen',
              lastMessageTime: serverTimestamp(),
              lastSender: user.uid,
            }),
          ]);
        }
      } catch (err) {
        console.log('Error enviando media personalizada:', err);
      }
    }
  };

  const handleReply = () => {
    if (!activeMsg) return;
    Alert.alert('Responder', `Respondiendo a: "${activeMsg.text}"`);
    clearSelection(); // 👈 antes decía setSelectedMessageId(null)
  };

  const handleFavorite = async () => {
    if (selectedIds.length === 0) return;
    try {
      const firstMsg = messages.find(m => m.id === selectedIds[0]);
      const newFav = !firstMsg?.isFavorite;
      const batch = selectedIds.map(id => {
        const msgRef = doc(db, `chats/${chatId}/messages/${id}`);
        return updateDoc(msgRef, { isFavorite: newFav });
      });
      await Promise.all(batch);
    } catch (error) {
      console.log("Error al marcar favorito:", error);
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
    closeDeleteConfirm(async () => {
      try {
        const msgsToDelete = messages.filter(m => selectedIds.includes(m.id));
        const deletions = msgsToDelete.map(async (msg) => {
          if (msg?.mediaUrl) {
            await deleteMediaFromCloudinary(msg.mediaUrl);
          }
          const msgRef = doc(db, `chats/${chatId}/messages/${msg.id}`);
          await deleteDoc(msgRef);
        });
        await Promise.all(deletions);
      } catch (error) {
        console.log("Error al borrar mensajes:", error);
      }
      clearSelection();
    });
  };

  const handleCancelDelete = () => {
    closeDeleteConfirm();
  };

  const handleForward = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const texts = messages.filter(m => selectedIds.includes(m.id)).map(m => m.text).join('", "');
    Alert.alert('Reenviar', `Reenviando ${count} mensaje${count > 1 ? 's' : ''}: "${texts}"`);
    clearSelection();
  };

  const handleCopy = async () => {
    if (!activeMsg.text) return;
    clearSelection();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage('Mensaje copiado al portapapeles');
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      // Escribir al clipboard después de que el toast de la app ya se vea
      setTimeout(() => {
        Clipboard.setStringAsync(activeMsg.text);
      }, 1000);
    });
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setToastMessage(null));
    }, 900);
  };

  const handleStartEdit = () => {
    if (!activeMsg || activeMsg.sender !== 'me') return;
    setInputText(activeMsg.text);
    setEditingMessageId(activeMsg.id);
    clearSelection(); // 👈 antes decía setSelectedMessageId(null)
  };

  const renderMessageItem = React.useCallback(({ item }) => {
    const isMe = item.sender === 'me';
    const isChecked = selectedIds.includes(item.id);
    return (
      <MessageItem
        item={item}
        isMe={isMe}
        isDark={isDark}
        colors={colors}
        chatName={chatName}
        isChecked={isChecked}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        setShowMsgInfo={setShowMsgInfo}
        onOpenMedia={openMediaViewer}
      />
    );
  }, [selectedIds, isDark, colors, chatName, openMediaViewer]);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [mediaPreview, setMediaPreview] = useState(null); 

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);
  
  return (
    <View style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={closeAllMenus}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* HEADER MULTI-SELECCIÓN O NORMAL */}
        {selectedIds.length > 0 ? (
          <View style={[styles.toolHeader, { backgroundColor: isDark ? '#1C1C1C' : '#E0EAE0', paddingTop: insets.top + 8 }]}>
            {/* Flecha + contador */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={clearSelection} style={{ paddingRight: 12 }}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerName, { color: colors.text, fontSize: 20 }]}>
                {selectedIds.length}
              </Text>
            </View>

            {/* Acciones — varían según si el mensaje es mío o del otro */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>

              <TouchableOpacity style={styles.toolIcon} onPress={handleReply}>
                <Ionicons name="arrow-undo" size={24} color={colors.text} />
                <Text style={[styles.toolText, { color: colors.text }]}>Responder</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toolIcon} onPress={handleFavorite}>
                <Ionicons
                  name={activeMsg?.isFavorite ? "star" : "star-outline"}
                  size={24}
                  color={colors.text}
                />
                <Text style={[styles.toolText, { color: colors.text }]}>Favorito</Text>
              </TouchableOpacity>

              {/* Editar: solo si es 1 mensaje Y es mío */}
              {selectedIds.length === 1 && activeMsg?.sender === 'me' && (
                <TouchableOpacity style={styles.toolIcon} onPress={handleStartEdit}>
                  <Ionicons name="pencil" size={24} color={colors.text} />
                  <Text style={[styles.toolText, { color: colors.text }]}>Editar</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.toolIcon} onPress={handleDelete}>
                <Ionicons name="trash" size={24} color="#a70d0d" />
                <Text style={[styles.toolText, { color: '#a70d0d', fontWeight: 'bold' }]}>Eliminar</Text>
              </TouchableOpacity>

              {selectedIds.length === 1 && activeMsg?.text ? (
                <TouchableOpacity style={styles.toolIcon} onPress={handleCopy}>
                  <Ionicons name="copy" size={24} color={colors.text} />
                  <Text style={[styles.toolText, { color: colors.text }]}>Copiar</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={styles.toolIcon} onPress={handleForward}>
                <Ionicons name="arrow-redo" size={24} color={colors.text} />
                <Text style={[styles.toolText, { color: colors.text }]}>Reenviar</Text>
              </TouchableOpacity>

            </View>
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

                {/* DETALLE DE INFO DEL MENSAJE (Leído por / Entregado a) */}
        {showMsgInfo && activeMsg && selectedIds.length === 0 && (
          <View style={[styles.infoOverlay, { backgroundColor: isDark ? '#1C1C1C' : '#FFF', borderColor: colors.border }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Información del mensaje</Text>
            <View style={styles.infoLine}>
              <Ionicons name="checkmark-done" size={16} color="#00A3FF" />
              <Text style={[styles.infoLabel, { color: colors.text }]}>Leído por: </Text>
              <Text style={{ color: '#888' }}>{chatName} (Hoy 17:45)</Text>
            </View>
            <View style={styles.infoLine}>
              <Ionicons name="checkmark" size={16} color="#888" />
              <Text style={[styles.infoLabel, { color: colors.text }]}>Entregado a: </Text>
              <Text style={{ color: '#888' }}>{chatName} (Hoy 17:42)</Text>
            </View>
            <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setShowMsgInfo(false)}>
              <Text style={styles.infoCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MENÚ DESPLEGABLE DEL HEADER (3 Puntos) */}
        {showHeaderMenu && (
          <View style={[styles.dropdownMenu, { backgroundColor: isDark ? '#1C1C1C' : '#FFF', borderColor: isDark ? '#333' : '#CCC' }]}>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { closeAllMenus(); Alert.alert('Nuevo Grupo', 'Crear nuevo grupo'); }}>
              <Text style={[styles.dropdownItemText, { color: colors.text }]}>Nuevo grupo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { closeAllMenus(); Alert.alert('Buscar', 'Buscar en la conversación'); }}>
              <Text style={[styles.dropdownItemText, { color: colors.text }]}>Buscar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { closeAllMenus(); Alert.alert('Archivos', 'Multimedia, enlaces y archivos'); }}>
              <Text style={[styles.dropdownItemText, { color: colors.text }]}>Archivos, enlaces y fotos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { closeAllMenus(); Alert.alert('Silenciar', 'Silenciar notificaciones'); }}>
              <Text style={[styles.dropdownItemText, { color: colors.text }]}>Silenciar notificaciones</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { closeAllMenus(); Alert.alert('Tema', 'Tema del chat'); }}>
              <Text style={[styles.dropdownItemText, { color: colors.text }]}>Tema del chat</Text>
            </TouchableOpacity>
            
            {/* Opción MÁS */}
            <TouchableOpacity 
              style={[styles.dropdownItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
              onPress={() => setShowMoreSubMenu(!showMoreSubMenu)}
            >
              <Text style={[styles.dropdownItemText, { color: colors.text }]}>Más</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </TouchableOpacity>

            {/* SUB-MENÚ MÁS */}
            {showMoreSubMenu && (
              <View style={[styles.subDropdownMenu, { backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5', borderColor: isDark ? '#444' : '#DDD' }]}>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { closeAllMenus(); setMessages([]); }}>
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>Vaciar chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { closeAllMenus(); Alert.alert('Difusión', 'Crear grupo de difusión'); }}>
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>Crear grupo de difusión</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { closeAllMenus(); Alert.alert('Reportar', 'Contacto reportado'); }}>
                  <Text style={[styles.dropdownItemText, { color: '#a70d0d', fontWeight: 'bold' }]}>Reportar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { closeAllMenus(); Alert.alert('Bloquear', 'Contacto bloqueado'); }}>
                  <Text style={[styles.dropdownItemText, { color: '#a70d0d', fontWeight: 'bold' }]}>Bloquear</Text>
                </TouchableOpacity>
              </View>
            )}
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
            onContentSizeChange={() => {
              if (messages.length > 0) {
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
              }
            }}
            removeClippedSubviews={true}
            maxToRenderPerBatch={15}
            windowSize={10}
            initialNumToRender={20}
            style={{ flex: 1 }}
          />
        )}

        {/* INPUT DE MENSAJE */}

          {/* Menú desplegable de Clip (Adjuntos) */}
          {showAttachmentMenu && (
            <View style={[styles.attachmentTray, { backgroundColor: isDark ? '#1C1C1C' : '#FFF', borderColor: colors.border }]}>
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
              <TouchableOpacity style={styles.attachmentItem} onPress={() => setShowAttachmentMenu(false)}>
                <Ionicons name="person" size={27} color={GREEN_ACCENT} />
                <Text style={[styles.attachmentText, { color: colors.text }]}>Ver perfil</Text>
              </TouchableOpacity>
            </View>
          )}

          {isLocked ? (
            // 🔒 VISTA DE GRABACIÓN BLOQUEADA (Imagen 2)
            <Animated.View style={[styles.lockedRecordContainer, {
                backgroundColor: isDark ? '#1C1C1C' : '#F2F2F2',
                borderColor: isDark ? '#2C2C2C' : '#E0E0E0',
                bottom: Math.max(keyboardHeight + 60, insets.bottom + 10),
                transform: [{ translateY: lockSlideAnim }],
                opacity: lockOpacityAnim,
              }]}>
              <View style={styles.recordTopRow}>
                <Text style={[styles.recordSeconds, { color: colors.text }]}>
                  {formatTime(recordSeconds)}
                </Text>

                {/* Waveform oscilante */}
                <View style={styles.waveformContainer}>
                  {waveBarAnims.map((anim, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.waveBar,
                        { backgroundColor: isPaused ? '#888' : GREEN_ACCENT, transform: [{ scaleY: anim }] },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* Botones de acción inferiores */}
              <View style={styles.recordActionRow}>
                {/* Descartar */}
                <TouchableOpacity
                  onPress={() => stopAndSendRecording(true)}
                  style={[styles.recordDiscardButton, { backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.10)' }]}
                >
                  <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>

                {/* Pausar / Reanudar */}
                <TouchableOpacity
                  onPress={togglePauseRecording}
                  style={[styles.recordPausePill, { backgroundColor: isDark ? '#2C2C2C' : '#E4E4E4' }]}
                >
                  <Ionicons name={isPaused ? "play" : "pause"} size={18} color={colors.text} />
                  <Text style={[styles.recordPauseLabel, { color: colors.text }]}>
                    {isPaused ? 'Reanudar' : 'Pausar'}
                  </Text>
                </TouchableOpacity>

                {/* Enviar */}
                <TouchableOpacity onPress={() => stopAndSendRecording(false)} style={[styles.recordSendButton, { backgroundColor: GREEN_ACCENT }]}>
                  <Feather name="arrow-up" size={28} color="#FFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            // ⌨️ FILA DE INPUT (texto normal o grabación activa sin bloquear)
            <View style={[styles.inputContainer, { paddingBottom: Math.max(keyboardHeight + 60, insets.bottom + 10) }]}>
              {isRecording ? (
                // 🎙️ VISTA DE GRABACIÓN ACTIVA SIN BLOQUEAR (Imagen 1)
                <Animated.View style={[styles.recordHintBar, {
                    backgroundColor: isDark ? '#1C1C1C' : '#F2F2F2',
                    transform: [{ translateX: cancelSlideAnim }],
                  }]}>
                  <Text style={[styles.recordSeconds, { color: colors.text }]}>
                    {formatTime(recordSeconds)}
                  </Text>
                  <View style={styles.cancelHintRow}>
                    <Ionicons name="chevron-back" size={16} color={isDark ? '#999' : '#777'} />
                    <Text style={[styles.cancelHintText, { color: isDark ? '#999' : '#777' }]}>
                      Desliza para cancelar
                    </Text>
                  </View>
                </Animated.View>
              ) : (
                <View style={[styles.textInputWrapper, { backgroundColor: isDark ? '#1C1C1C' : '#F2F2F2' }]}>
                  <TouchableOpacity onPress={() => setShowCustomCamera(true)}>
                    <Ionicons name="camera-outline" size={24} color={GREEN_ACCENT} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>

                  <TextInput
                    placeholder={editingMessageId ? "Editar mensaje..." : "Mensaje"}
                    placeholderTextColor="#888"
                    value={inputText}
                    onChangeText={setInputText}
                    style={[styles.textInput, { color: colors.text }]}
                    multiline
                  />

                  <TouchableOpacity onPress={() => { setShowAttachmentMenu(!showAttachmentMenu); setShowHeaderMenu(false); }}>
                    <Feather name="paperclip" size={20} color={GREEN_ACCENT} style={{ marginRight: 8 }} />
                  </TouchableOpacity>
                </View>
              )}

              {!isRecording && inputText.trim().length > 0 ? (
                // Botón Enviar texto normal
                <TouchableOpacity 
                  onPress={handleSend}
                  style={[styles.actionButton, { backgroundColor: GREEN_ACCENT }]}
                >
                  <Feather name="arrow-up" size={28} color="#FFF" />
                </TouchableOpacity>
              ) : (
                // Botón Micrófono: SIEMPRE el mismo elemento (no se desmonta al
                // empezar a grabar), para no perder el gesto de touchMove/touchEnd
                <View style={{ position: 'relative' }}>
                  {isRecording && (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.lockIndicator,
                        {
                          backgroundColor: isDark ? '#1C1C1C' : '#F2F2F2',
                          transform: [{ translateY: lockBounceAnim }],
                        },
                      ]}
                    >
                      <Ionicons name="lock-closed" size={15} color={GREEN_ACCENT} />
                      <Ionicons name="chevron-up" size={13} color={GREEN_ACCENT} style={{ marginTop: 2 }} />
                    </Animated.View>
                  )}

                  <View
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={[
                      styles.actionButton,
                      { backgroundColor: GREEN_ACCENT },
                      isRecording && styles.actionButtonRecording,
                    ]}
                  >
                    <Ionicons name="mic" size={24} color="#FFF" />
                  </View>
                </View>
              )}
            </View>
          )}
          <CustomCameraModal
          visible={showCustomCamera}
          onClose={() => setShowCustomCamera(false)}
          onSend={handleSendCustomMediaList}
          username={chatName}
        />
      </View>
    </TouchableWithoutFeedback>

      {toastMessage && (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { opacity: toastOpacity }]}
        >
          <Ionicons name="checkmark-circle" size={18} color="#FFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

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

      <Modal visible={!!mediaPreview} animationType="slide" transparent={false} onRequestClose={() => setMediaPreview(null)}>
        <View style={{ flex: 1, backgroundColor: '#111' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 12 }}>
            <TouchableOpacity onPress={() => setMediaPreview(null)}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={{ color: '#FFF', fontSize: 16, fontFamily: 'Nunito-Bold' }}>
              {mediaPreview?.assets?.length > 1 ? `${mediaPreview.assets.length} elementos` : 'Vista previa'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Preview principal */}
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
                  <Image
                    source={{ uri: asset.uri }}
                    style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.62 }}
                    resizeMode="contain"
                  />
                  {isVideo && (
                    <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.85)" />
                    </View>
                  )}
                </View>
              );
            }}
          />

          {/* Thumbnails si hay más de 1 */}
          {(mediaPreview?.assets?.length || 0) > 1 && (
            <FlatList
              data={mediaPreview?.assets || []}
              keyExtractor={(_, i) => `th-${i}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingVertical: 8 }}
              renderItem={({ item: asset }) => (
                <Image
                  source={{ uri: asset.uri }}
                  style={{ width: 56, height: 56, borderRadius: 8, borderWidth: 1.5, borderColor: GREEN_ACCENT }}
                  resizeMode="cover"
                />
              )}
            />
          )}

          {/* Input de caption + botón enviar */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingBottom: Math.max(insets.bottom + 8, 16),
            paddingTop: 8,
            gap: 10,
            backgroundColor: '#1A1A1A',
          }}>
            <TextInput
              placeholder="Agregar un comentario..."
              placeholderTextColor="#888"
              value={mediaPreview?.caption || ''}
              onChangeText={(t) => setMediaPreview(prev => ({ ...prev, caption: t }))}
              style={{
                flex: 1,
                color: '#FFF',
                fontSize: 15,
                fontFamily: 'Nunito-Regular',
                backgroundColor: '#2C2C2C',
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 10,
                maxHeight: 100,
              }}
              multiline
            />
            <TouchableOpacity
              onPress={handleSendMediaPreview}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: GREEN_ACCENT, justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="arrow-up" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <MediaViewerModal
        visible={mediaViewerVisible}
        items={mediaMessages}
        initialIndex={mediaViewerIndex}
        onClose={() => setMediaViewerVisible(false)}
      />
    </View>
  );
}