import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, Animated, Modal, FlatList, Linking } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_WIDTH } from './Chatconstants';
import styles from './Chatstyles';

// Visor de media a pantalla completa (estilo WhatsApp): swipe horizontal
// entre fotos/videos/archivos del chat, con zoom por doble-tap en imágenes.

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

export default MediaViewerModal;