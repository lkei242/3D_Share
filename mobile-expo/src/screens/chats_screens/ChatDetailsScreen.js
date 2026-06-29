import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  Keyboard,
  Image,
  Modal,
  Linking,
  Dimensions
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { API_URL } from '../config/api';
import { deleteMediaFromCloudinary } from '../config/mediaHelper';
import {
  useAudioPlayer,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import Sound from 'react-native-nitro-sound';
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
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';

const GREEN_ACCENT = '#546F1C';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Clasifica el mimeType real en 'image' | 'video' | 'file'
const getMediaCategory = (mimeType) => {
  if (!mimeType) return 'file';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
};

// Cloudinary genera automáticamente un frame del video como thumbnail
// si pedís la misma URL pero con extensión .jpg
const getVideoThumbnail = (url) => url.replace(/\.\w+$/, '.jpg');

const AudioPlayer = React.memo(({ url, duration, isMe, colors }) => {
  const player = useAudioPlayer({ uri: url });
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [waveformWidth, setWaveformWidth] = useState(150);
  const progressRef = useRef(0);
  const isSeekingRef = useRef(false);
  const waveformOffsetRef = useRef(0);
  const waveformRef = useRef(null);
  const isDraggedRef = useRef(false);
  const barsRef = useRef(null);

  if (!barsRef.current) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = ((hash << 5) - hash) + url.charCodeAt(i);
      hash |= 0;
    }
    barsRef.current = new Array(35).fill(0).map((_, i) => {
      const val = Math.abs(Math.sin(hash * (i + 1)) * 100);
      return Math.floor(val % 24) + 6;
    });
  }
  const bars = barsRef.current;

  const totalSecs = (() => {
    if (!duration) return 30;
    const parts = duration.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]) || 30;
  })();

  useEffect(() => {
    return () => player.release();
  }, [player]);

  useEffect(() => {
    let interval;
    if (isPlaying && !isSeekingRef.current) {
      interval = setInterval(() => {
        let actual = null;
        try {
          if (player.status && typeof player.status.currentTime === 'number') {
            actual = player.status.currentTime;
          }
        } catch (e) {}

        if (actual !== null && totalSecs > 0) {
          const newProgress = Math.min(actual / totalSecs, 1);
          progressRef.current = newProgress;
          if (newProgress >= 1) {
            setProgress(1);
            setHasEnded(true);
            setIsPlaying(false);
          } else {
            setProgress(newProgress);
          }
        } else {
          progressRef.current += 1 / (totalSecs * 4);
          if (progressRef.current >= 1) {
            progressRef.current = 1;
            setProgress(1);
            setHasEnded(true);
            setIsPlaying(false);
          } else {
            setProgress(progressRef.current);
          }
        }
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalSecs]);

  const handlePlayPause = async () => {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
      setLoadingAudio(true);
      const seekPos = isDraggedRef.current ? progressRef.current * totalSecs : null;
      isDraggedRef.current = false;

      if (hasEnded) {
        setHasEnded(false);
        if (seekPos !== null && seekPos > 0) {
          await player.play();
          await player.seekTo(seekPos);
        } else {
          progressRef.current = 0;
          setProgress(0);
          await player.play();
          await player.seekTo(0);
        }
      } else if (seekPos !== null && seekPos > 0) {
        await player.play();
        await player.seekTo(seekPos);
      } else {
        await player.play();
      }

      setIsPlaying(true);
      setLoadingAudio(false);
      }
    };

  const updateSeek = (ratio) => {
      const clamped = Math.min(Math.max(ratio, 0), 1);
      progressRef.current = clamped;
      setProgress(clamped);
      setHasEnded(false);
    };

  const handleTouchStart = (e) => {
      isSeekingRef.current = true;
      isDraggedRef.current = true;
      const x = e.nativeEvent.pageX - waveformOffsetRef.current;
      updateSeek(x / waveformWidth);
      if (isPlaying) {
        player.seekTo(progressRef.current * totalSecs);
      }
    };

  const handleTouchMove = (e) => {
      const x = e.nativeEvent.pageX - waveformOffsetRef.current;
      updateSeek(x / waveformWidth);
      if (isPlaying) {
        player.seekTo(progressRef.current * totalSecs);
      }
    };

  const handleTouchEnd = () => {
      isSeekingRef.current = false;
      if (isPlaying) {
        player.seekTo(progressRef.current * totalSecs);
      }
    };

  const played = isMe ? '#34C759' : '#007AFF';
  const inactive = isMe ? 'rgba(255,255,255,0.3)' : '#C8C8C8';
  const playBg = isMe ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)';
  const numPlayed = Math.floor(progress * bars.length);
  const dotSize = 8;

  return (
    <View style={[styles.waContainer, { backgroundColor: playBg }]}>
      <TouchableOpacity onPress={handlePlayPause} style={[styles.waPlayBtn, { backgroundColor: played }]}>
        {loadingAudio ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={16}
            color="#FFF"
            style={isPlaying ? {} : { marginLeft: 2 }}
          />
        )}
      </TouchableOpacity>

      <View
        ref={waveformRef}
        style={styles.waWaveform}
        onLayout={(e) => {
          setWaveformWidth(e.nativeEvent.layout.width);
          waveformRef.current?.measureInWindow((x) => {
            waveformOffsetRef.current = x;
          });
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
      >
        {bars.map((h, i) => (
          <View
            key={i}
            style={[styles.waBar, { height: h, backgroundColor: i < numPlayed ? played : inactive }]}
          />
        ))}

        <View
          style={[styles.waDot, {
            left: numPlayed * (3 + 2) + 1.5 - dotSize / 2,
            backgroundColor: played,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
          }]}
        />
      </View>

      <Text style={[styles.waDuration, { color: isMe ? 'rgba(255,255,255,0.8)' : '#777' }]}>
        {duration || '0:00'}
      </Text>
    </View>
  );

}, (prev, next) => prev.url === next.url && prev.isMe === next.isMe && prev.duration === next.duration);

// --- Visor de media a pantalla completa (estilo WhatsApp) ---

// Una sola "página" del visor: imagen con doble-tap para zoom, video con reproductor, o archivo con botón de abrir
const MediaViewerItem = ({ item, isActive }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isZoomedRef = useRef(false);
  const lastTapRef = useRef(0);

  // El hook siempre se llama (regla de hooks); si no es video, no le damos source.
  const player = useVideoPlayer(item.type === 'video' ? item.mediaUrl : null, (p) => {
    if (p) p.loop = false;
  });

  useEffect(() => {
    if (player && item.type === 'video' && !isActive) {
      player.pause();
    }
  }, [isActive]);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      const target = isZoomedRef.current ? 1 : 2.5;
      isZoomedRef.current = !isZoomedRef.current;
      Animated.spring(scaleAnim, { toValue: target, useNativeDriver: true, friction: 6 }).start();
    }
    lastTapRef.current = now;
  };

  if (item.type === 'video') {
    return (
      <View style={styles.mediaViewerPage}>
        <VideoView
          player={player}
          style={styles.mediaViewerVideo}
          nativeControls
          allowsFullscreen
          contentFit="contain"
        />
      </View>
    );
  }

  if (item.type === 'file') {
    return (
      <View style={styles.mediaViewerPage}>
        <View style={styles.mediaViewerFileCard}>
          <Ionicons name="document-text" size={64} color="#FFF" />
          <Text style={styles.mediaViewerFileName} numberOfLines={2}>
            {item.fileName || item.text}
          </Text>
          <TouchableOpacity
            style={styles.mediaViewerFileBtn}
            onPress={() => Linking.openURL(item.mediaUrl)}
          >
            <Ionicons name="download-outline" size={18} color="#FFF" />
            <Text style={styles.mediaViewerFileBtnText}>Abrir / Descargar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mediaViewerPage}>
      <Pressable onPress={handleDoubleTap} style={{ width: '100%', height: '100%' }}>
        <Animated.Image
          source={{ uri: item.mediaUrl }}
          style={[styles.mediaViewerImage, { transform: [{ scale: scaleAnim }] }]}
          resizeMode="contain"
        />
      </Pressable>
    </View>
  );
};

// Modal con swipe horizontal entre todas las fotos/videos/archivos del chat
const MediaViewerModal = ({ visible, items, initialIndex, onClose }) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

  useEffect(() => {
    if (visible) setCurrentIndex(initialIndex || 0);
  }, [visible, initialIndex]);

  const handleScrollEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(idx);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.mediaViewerContainer}>
        <View style={[styles.mediaViewerHeader, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.mediaViewerCloseBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.mediaViewerCounter}>
            {items.length > 0 ? `${currentIndex + 1} / ${items.length}` : ''}
          </Text>
          <TouchableOpacity
            onPress={() => items[currentIndex] && Linking.openURL(items[currentIndex].mediaUrl)}
            style={styles.mediaViewerCloseBtn}
          >
            <Ionicons name="share-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {visible && (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            horizontal
            pagingEnabled
            initialScrollIndex={initialIndex || 0}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={handleScrollEnd}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <MediaViewerItem item={item} isActive={index === currentIndex} />
            )}
          />
        )}
      </View>
    </Modal>
  );
};

// Componente de burbuja animada adaptado para Firestore
const MessageItem = React.memo(({
  item, 
  isMe, 
  isDark, 
  colors, 
  chatName, 
  isChecked,
  selectedIds,
  onToggleSelect,
  setShowMsgInfo,
  onOpenMedia
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
      toValue: isChecked ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isChecked]);

  const handlePressIn = () => {
    if (isChecked) return;
    Animated.timing(fadeAnim, { toValue: 1, duration: 80, useNativeDriver: false }).start();
  };

  const handlePressOut = () => {
    if (isChecked) return;
    Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start();
  };

  const handlePress = () => {
    if (selectedIds.length > 0) {
      onToggleSelect(item.id);
    }
  };

  const handleLongPress = () => {
    onToggleSelect(item.id);
    setShowMsgInfo(false);
  };

  // En modo selección, tocar la miniatura selecciona el mensaje en vez de abrir el visor
  const handleMediaPress = () => {
    if (selectedIds.length > 0) {
      onToggleSelect(item.id);
    } else {
      onOpenMedia(item);
    }
  };

  return (
    <Pressable
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
        {/* CHECKBOX — visible solo en modo multi-selección */}
        {selectedIds.length > 0 && (
          <TouchableOpacity
            onPress={() => onToggleSelect(item.id)}
            style={styles.checkboxColumn}
          >
            <Ionicons
              name={isChecked ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={isChecked ? "#34C759" : "#999"}
            />
          </TouchableOpacity>
        )}

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
          {item.type === 'audio' ? (
            <AudioPlayer url={item.mediaUrl} duration={item.audioDuration} isMe={isMe} colors={colors} />
          ) : item.type === 'image' ? (
            <TouchableOpacity onPress={handleMediaPress} activeOpacity={0.85}>
              <Image source={{ uri: item.mediaUrl }} style={styles.mediaThumb} resizeMode="cover" />
            </TouchableOpacity>
          ) : item.type === 'video' ? (
            <TouchableOpacity onPress={handleMediaPress} activeOpacity={0.85}>
              <Image source={{ uri: getVideoThumbnail(item.mediaUrl) }} style={styles.mediaThumb} resizeMode="cover" />
              <View style={styles.mediaPlayOverlay}>
                <Ionicons name="play-circle" size={42} color="#FFF" />
              </View>
            </TouchableOpacity>
          ) : item.type === 'file' ? (
            <TouchableOpacity onPress={handleMediaPress} style={styles.fileCard} activeOpacity={0.85}>
              <Ionicons name="document-text" size={28} color={isMe ? '#FFF' : colors.text} />
              <Text style={[styles.fileName, { color: isMe ? '#FFF' : colors.text }]} numberOfLines={1}>
                {item.fileName || item.text}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.messageText, { color: isMe ? '#FFF' : colors.text }]}>
              {item.text}
              {"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
            </Text>
          )}

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
}, (prev, next) => 
  prev.item.id === next.item.id && 
  prev.item.text === next.item.text && 
  prev.item.read === next.item.read && 
  prev.item.isFavorite === next.item.isFavorite && 
  prev.isChecked === next.isChecked && 
  prev.isDark === next.isDark &&
  (prev.selectedIds.length > 0) === (next.selectedIds.length > 0)
);

export default function ChatDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colors.text === '#FFFFFF';
  
  const { chatId, name: chatName } = route.params;

  const [messages, setMessages] = useState([]);

  // --- Visor de media a pantalla completa ---
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const mediaMessages = React.useMemo(
    () => messages.filter(m => ['image', 'video', 'file'].includes(m.type)),
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

    // --- Estados de Grabación ---
  const [isLocked, setIsLocked] = useState(false);
  const waveBarAnims = useRef(
    Array.from({ length: 22 }, () => new Animated.Value(0.3))
  ).current;
  const lockBounceAnim = useRef(new Animated.Value(0)).current;
  const lockSlideAnim = useRef(new Animated.Value(50)).current;
  const lockOpacityAnim = useRef(new Animated.Value(0)).current;
  const cancelSlideAnim = useRef(new Animated.Value(0)).current;
  const isCancellingRef = useRef(false);

  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const animateWaveFromDB = (db) => {
  const normalized = Math.min(1, Math.max(0, (db + 60) / 55));
    waveBarAnims.forEach((anim) => {
      const variation = 0.75 + Math.random() * 0.5;
      const target = Math.max(0.1, Math.min(1, normalized * variation));
      Animated.timing(anim, {
        toValue: target,
        duration: 80,
        useNativeDriver: true,
      }).start();
    });
  };
  const handleToggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      return [...prev, id];
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // Cronómetro sincronizado con el grabador real (vía addRecordBackListener).
  // El listener deja de emitir mientras la grabación está en pausa, así que
  // recordSeconds se congela solo, sin necesidad de chequear isPaused a mano.
  useEffect(() => {
    if (!isRecording) {
      setRecordSeconds(0);
      return;
    }

    Sound.addRecordBackListener((e) => {
      setRecordSeconds(Math.floor(e.currentPosition / 1000));
      if (e.currentMetering != null) {
        animateWaveFromDB(e.currentMetering);
      }
    });

    return () => {
      Sound.removeRecordBackListener();
    };
  }, [isRecording]);

  // useEffect 2 — resetear barras al pausar/detener
  useEffect(() => {
    const isActive = isRecording && !isPaused;

    if (!isActive) {
      waveBarAnims.forEach((anim) => {
        anim.stopAnimation();
        Animated.timing(anim, { toValue: 0.1, duration: 200, useNativeDriver: true }).start();
      });
    }
  }, [isRecording, isPaused]);

  // Animación de "rebote" del indicador de bloqueo (sugiere deslizar hacia arriba)
  useEffect(() => {
    let loopAnim;
    if (isRecording && !isLocked) {
      loopAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(lockBounceAnim, { toValue: -6, duration: 550, useNativeDriver: true }),
          Animated.timing(lockBounceAnim, { toValue: 0, duration: 550, useNativeDriver: true }),
        ])
      );
      loopAnim.start();
    } else {
      lockBounceAnim.setValue(0);
    }
    return () => loopAnim && loopAnim.stop();
  }, [isRecording, isLocked]);

  useEffect(() => {
    if (isLocked) {
      Animated.parallel([
        Animated.spring(lockSlideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        Animated.timing(lockOpacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      lockSlideAnim.setValue(50);
      lockOpacityAnim.setValue(0);
    }
  }, [isLocked]);

  // --- Permisos y modo de audio (esto sigue siendo de expo-audio) ---
  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permiso Denegado', 'Se necesita permiso de micrófono para enviar notas de voz.');
      }
      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  const startRecording = async () => {
    try {
      setIsPaused(false);
      setIsLocked(false);
      const uri = await Sound.startRecorder(
        undefined,  // path por defecto
        undefined,  // audioSet por defecto
        true        //  meteringEnabled
      );
      if (!uri) throw new Error('No se obtuvo URI');
      setIsRecording(true);
    } catch (err) {
      console.log('Error iniciando grabación:', err);
      setIsRecording(false);
    }
  };

  const stopAndSendRecording = async (discard = false) => {
    try {
      const duration = recordSeconds;
      const uri = await Sound.stopRecorder();
      Sound.removeRecordBackListener();
      console.log('URI del audio grabado:', uri);
      console.log('Duración total:', duration, 'segundos');

      setIsRecording(false);
      setIsPaused(false);
      setIsLocked(false);

      if (discard || !uri || duration < 1) {
        console.log("Grabación descartada o muy corta");
        return;
      }

      // Subir archivo de audio a Cloudinary a través del Backend
      const user = auth.currentUser;
      const token = await user.getIdToken();

      // nitro-sound devuelve .m4a en iOS y .mp4 en Android — usamos la
      // extensión real del archivo en vez de asumir siempre m4a
      const extension = uri.split('.').pop() || 'm4a';

      const uploadRes = await new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('imagen', {
          uri,
          type: `audio/${extension}`,
          name: `voice_${Date.now()}.${extension}`,
        });

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/api/media/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.onload = () => resolve({ ok: xhr.status === 200, json: () => JSON.parse(xhr.responseText) });
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        Alert.alert('Error', 'No se pudo subir la nota de voz a Cloudinary.');
        return;
      }

      const durationText = formatTime(duration);
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      await addDoc(messagesRef, {
        text: 'Nota de voz',
        type: 'audio',
        mediaUrl: uploadData.url,
        audioDuration: durationText,
        sender: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        isFavorite: false
      });

      const chatRef = doc(db, `chats/${chatId}`);
      await updateDoc(chatRef, {
        lastMessage: `🎙️ Nota de voz (${durationText})`,
        lastMessageTime: serverTimestamp(),
        lastSender: user.uid
      });

    } catch (err) {
      console.log('Error deteniendo grabación:', err);
      setIsRecording(false);
    } finally {
      setRecordSeconds(0);
    }
  };

  const togglePauseRecording = async () => {
    try {
      if (isPaused) {
        await Sound.resumeRecorder();
        setIsPaused(false);
      } else {
        await Sound.pauseRecorder();
        setIsPaused(true);
      }
    } catch (err) {
      console.log('Error pausando/reanudando grabación:', err);
    }
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.nativeEvent.pageY;
    touchStartX.current = e.nativeEvent.pageX;
    isCancellingRef.current = false; // 👈
    startRecording();
  };

  const handleTouchMove = (e) => {
    if (isLocked || isCancellingRef.current) return; // 👈 agregá isCancellingRef.current

    const currentY = e.nativeEvent.pageY;
    const currentX = e.nativeEvent.pageX;
    const deltaY = touchStartY.current - currentY;
    const deltaX = touchStartX.current - currentX;

    if (deltaY > 60) {
      setIsLocked(true);
      cancelSlideAnim.setValue(0);
      return;
    }

    if (deltaX > 0) {
      cancelSlideAnim.setValue(-deltaX);
    }

    if (deltaX > 80) {
      isCancellingRef.current = true; // 👈 marcar antes de animar
      Animated.timing(cancelSlideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        cancelSlideAnim.setValue(0);
        stopAndSendRecording(true);
      });
    }
  };

  const handleTouchEnd = () => {
    if (isCancellingRef.current) return;
    if (!isLocked) {
      const deltaX = touchStartX.current - (cancelSlideAnim._value ? -cancelSlideAnim._value : 0);
      // Volver a posición original con spring
      Animated.spring(cancelSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
      stopAndSendRecording(false);
    }
  };

  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

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
          type: data.type || 'text', // 👈 Traemos el tipo
          mediaUrl: data.mediaUrl || null, // 👈 Traemos la url de Cloudinary
          audioDuration: data.audioDuration || null, // 👈 Traemos la duración
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

    // Como la cámara nativa solo devuelve una foto/video por vez, armamos una
    // cola: después de cada toma le preguntamos al usuario si quiere otra o ya
    // enviar todo lo que acumuló.
    const capturedAssets = [];
    let keepShooting = true;

    while (keepShooting) {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) break;
      capturedAssets.push(result.assets[0]);

      keepShooting = await new Promise((resolve) => {
        Alert.alert(
          `${capturedAssets.length} ${capturedAssets.length > 1 ? 'archivos listos' : 'archivo listo'}`,
          '¿Querés tomar otra foto o video?',
          [
            { text: 'Enviar', onPress: () => resolve(false) },
            { text: 'Tomar otra', onPress: () => resolve(true) },
          ],
          { cancelable: false }
        );
      });
    }

    for (const asset of capturedAssets) {
      await handleUploadAndSendMedia(asset);
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
      for (const asset of result.assets) {
        await handleUploadAndSendMedia(asset);
      }
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
    const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const chatRef = doc(db, `chats/${chatId}`);
    await Promise.all([
      addDoc(messagesRef, {
        text: `📍 Ubicación: ${mapsUrl}`,
        type: 'text',
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
              <TouchableOpacity style={styles.attachmentItem} onPress={handleOpenCamera}>
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
                  <TouchableOpacity onPress={handleOpenCamera}>
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

      <MediaViewerModal
        visible={mediaViewerVisible}
        items={mediaMessages}
        initialIndex={mediaViewerIndex}
        onClose={() => setMediaViewerVisible(false)}
      />
    </View>
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
  toolText: { fontSize: 12.5, marginTop: 2, fontFamily: 'Nunito-Regular' },
  messagesList: { paddingVertical: 20, gap: 3 },
  myMessageRow: { flexDirection: 'row', alignItems: 'flex-end', width: '100%', paddingHorizontal: 10, paddingVertical: 4 },
  otherMessageRow: { flexDirection: 'row', alignItems: 'flex-end', width: '100%', paddingHorizontal: 10, paddingVertical: 4 },
  bubbleAvatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#00A3FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFEE00' },
  bubbleAvatarText: { color: '#FFEE00', fontSize: 15, fontWeight: 'bold' },
  myMessageBubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 15, maxWidth: '100%', flexShrink: 1, elevation: 1 },
  otherMessageBubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 15, maxWidth: '100%', flexShrink: 1, elevation: 1 },
  messageText: { fontSize: 16, fontFamily: 'Nunito-Regular', lineHeight: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, alignSelf: 'flex-end' },
  messageTime: { fontSize: 13, fontFamily: 'Nunito-Regular' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  textInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 25, paddingHorizontal: 8, minHeight: 48, maxHeight: 100 },
  textInput: { flex: 1, fontSize: 16, fontFamily: 'Nunito-Regular', paddingHorizontal: 10, paddingVertical: 8 },
  actionButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  infoOverlay: {position: 'absolute',top: 100,left: 20,right: 20,padding: 16,borderRadius: 12,borderWidth: 1,shadowColor: '#000',shadowOffset: { width: 0, height: 2 },shadowOpacity: 0.2,shadowRadius: 4,elevation: 5,zIndex: 100,},
  infoTitle: {fontSize: 16,fontFamily: 'Nunito-Bold',marginBottom: 12,},
  infoLine: {flexDirection: 'row',alignItems: 'center',marginVertical: 6,},
  infoLabel: {fontWeight: 'bold',marginLeft: 6,},
  infoCloseBtn: {marginTop: 14,alignSelf: 'flex-end',},
  infoCloseText: {color: GREEN_ACCENT,fontWeight: 'bold',},
  dropdownMenu: {position: 'absolute',top: 90,right: 16,borderRadius: 12,borderWidth: 0.5,shadowColor: '#000',shadowOffset: { width: 0, height: 2 },shadowOpacity: 0.15,shadowRadius: 4,elevation: 4,zIndex: 99,minWidth: 200,paddingVertical: 6,},
  dropdownItem: {paddingVertical: 12,paddingHorizontal: 16,},
  dropdownItemText: {fontSize: 14,fontFamily: 'Nunito-Regular',},
  subDropdownMenu: {borderRadius: 8,borderWidth: 0.5,marginTop: 4,marginHorizontal: 8,paddingVertical: 4,},
  attachmentTray: {position: 'absolute',bottom: 120,right: 20,left: 20,borderRadius: 15,borderWidth: 0.5,shadowColor: '#000',shadowOffset: { width: 0, height: -2 },shadowOpacity: 0.15,shadowRadius: 4,elevation: 4,zIndex: 98,padding: 16,flexDirection: 'row',justifyContent: 'space-around',},
  attachmentItem: {alignItems: 'center',width: 65,},
  attachmentText: {fontSize: 12,marginTop: 4,fontFamily: 'Nunito-Regular',textAlign: 'center',},
  lockedRecordContainer: {position: 'absolute',left: 12,right: 12,padding: 14,borderRadius: 24,borderWidth: 1,gap: 12,zIndex: 50,elevation: 8,shadowColor: '#000',shadowOffset: { width: 0, height: 4 },shadowOpacity: 0.2,shadowRadius: 6,},
  recordTopRow: {flexDirection: 'row',alignItems: 'center',justifyContent: 'space-between',paddingHorizontal: 8,},
  recordSeconds: {fontSize: 16,fontFamily: 'Nunito-Bold',minWidth: 50,},
  waveformContainer: {flexDirection: 'row',alignItems: 'center',gap: 3,flex: 1,justifyContent: 'center',paddingHorizontal: 12,height: 36,},
  waveBar: {width: 3,height: 32,borderRadius: 1.5,},
  recordActionRow: {flexDirection: 'row',alignItems: 'center',justifyContent: 'space-between',gap: 10,paddingHorizontal: 4,},
  recordDiscardButton: {width: 44,height: 44,borderRadius: 22,justifyContent: 'center',alignItems: 'center',},
  recordSendButton: {width: 44,height: 44,borderRadius: 22,justifyContent: 'center',alignItems: 'center',elevation: 2,},
  recordPausePill: {flex: 1,flexDirection: 'row',alignItems: 'center',justifyContent: 'center',gap: 8,height: 48,borderRadius: 24,},
  recordPauseLabel: {fontSize: 15,fontFamily: 'Nunito-Bold',},
  recordHintBar: {flex: 1,flexDirection: 'row',alignItems: 'center',justifyContent: 'space-between',borderRadius: 25,paddingHorizontal: 16,minHeight: 48,},
  cancelHintRow: {flexDirection: 'row',alignItems: 'center',gap: 4,},
  cancelHintText: {fontSize: 14,fontFamily: 'Nunito-Regular',},
  actionButtonRecording: {width: 56,height: 56,borderRadius: 28,marginRight: -4,marginBottom: -4,elevation: 3,},
  lockIndicator: {position: 'absolute',bottom: 64,right: 4,width: 36,paddingVertical: 8,borderRadius: 18,alignItems: 'center',elevation: 3,shadowColor: '#000',shadowOffset: { width: 0, height: 1 },shadowOpacity: 0.15,shadowRadius: 2,},
  waContainer: {flexDirection: 'row',alignItems: 'center',paddingVertical: 6,paddingHorizontal: 6,borderRadius: 8,width: 280,},
  waPlayBtn: {width: 30,height: 30,borderRadius: 15,justifyContent: 'center',alignItems: 'center',marginRight: 6,},
  waWaveform: {flex: 1,flexDirection: 'row',alignItems: 'center',height: 28,gap: 2,position: 'relative',},
  waBar: {width: 3,borderRadius: 1.5,},
  waDuration: {fontSize: 11,fontFamily: 'Nunito-Regular',minWidth: 28,textAlign: 'right',marginLeft: 6,},
  waDot: {position: 'absolute',top: '50%',marginTop: -4,zIndex: 10,},
  toast: {position: 'absolute',bottom: 112,left: 20,right: 20,backgroundColor: '#323232',flexDirection: 'row',alignItems: 'center',justifyContent: 'center',gap: 8,paddingVertical: 12,paddingHorizontal: 20,borderRadius: 12,elevation: 6,shadowColor: '#000',shadowOffset: { width: 0, height: 3 },shadowOpacity: 0.3,shadowRadius: 5,zIndex: 999,},
  toastText: {color: '#FFF',fontSize: 15,fontFamily: 'Nunito-Bold',},
  deleteConfirm: {position: 'absolute',left: 16,right: 16,padding: 16,borderRadius: 16,borderWidth: 1,gap: 14,shadowColor: '#000',shadowOffset: { width: 0, height: 4 },shadowOpacity: 0.2,shadowRadius: 6,elevation: 8,zIndex: 100,},
  deleteConfirmText: {fontSize: 16,fontFamily: 'Nunito-Bold',textAlign: 'center',},
  deleteConfirmActions: {flexDirection: 'row',gap: 12,},
  deleteConfirmBtn: {flex: 1,flexDirection: 'row',alignItems: 'center',justifyContent: 'center',gap: 6,paddingVertical: 12,borderRadius: 12,},
  deleteConfirmBtnText: {fontSize: 15,fontFamily: 'Nunito-Bold',},

  // --- Miniaturas dentro de la burbuja del chat ---
  mediaThumb: { width: 200, height: 200, borderRadius: 12, backgroundColor: '#0002' },
  mediaPlayOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, maxWidth: 220 },
  fileName: { fontSize: 14, fontFamily: 'Nunito-Bold', flexShrink: 1 },

  // --- Visor de media a pantalla completa ---
  mediaViewerContainer: { flex: 1, backgroundColor: '#000' },
  mediaViewerHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10 },
  mediaViewerCloseBtn: { padding: 6 },
  mediaViewerCounter: { color: '#FFF', fontSize: 14, fontFamily: 'Nunito-Bold' },
  mediaViewerPage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  mediaViewerImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.85 },
  mediaViewerVideo: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6 },
  mediaViewerFileCard: { alignItems: 'center', gap: 14, paddingHorizontal: 30 },
  mediaViewerFileName: { color: '#FFF', fontSize: 16, fontFamily: 'Nunito-Bold', textAlign: 'center' },
  mediaViewerFileBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: GREEN_ACCENT, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, marginTop: 10 },
  mediaViewerFileBtnText: { color: '#FFF', fontSize: 14, fontFamily: 'Nunito-Bold' },
});