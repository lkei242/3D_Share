import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, Animated, Modal, FlatList, Linking } from 'react-native';
import { PinchGestureHandler, PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Accelerometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './Chatconstants';
import styles from './Chatstyles';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

// Umbral mínimo de inclinación para considerar que el celular realmente se giró
// (evita que tiemble si está casi plano sobre una mesa).
const TILT_THRESHOLD = 0.2;

// Una sola "página" del visor: imagen o video con pinch-to-zoom + pan,
// y doble-tap como atajo rápido para alternar zoom.
const MediaViewerItem = ({ item, isActive, insets, onZoomChange }) => {
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scale = useRef(Animated.multiply(baseScale, pinchScale)).current;
  const lastScaleValue = useRef(1);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef({ x: 0, y: 0 });

  // Rotación por orientación física del celular (solo para imágenes).
  const rotation = useRef(new Animated.Value(0)).current;
  const currentAngleRef = useRef(0);

  // Factor de escala extra que se activa solo al rotar 90°/-90°, para que
  // una imagen muy alta (o muy ancha) entre completa en la pantalla al girarla.
  const orientationScale = useRef(new Animated.Value(1)).current;

  const [zoomed, setZoomed] = useState(false);
  const [naturalSize, setNaturalSize] = useState(null);
  const lastTapRef = useRef(0);
  const pinchRef = useRef(null);
  const panRef = useRef(null);

  const player = useVideoPlayer(item.type === 'video' ? item.mediaUrl : null, (p) => {
    if (p) {
      p.loop = false;
      p.muted = false;
      p.volume = 1;
    }
  });

  // Altura real usable, descontando status bar y barra de navegación del sistema
    const mediaHeight = (SCREEN_HEIGHT - (insets?.top || 0) - (insets?.bottom || 0)) * 1.1653;

  // Si el aspect ratio de la imagen coincide con el de la pantalla (ej: una captura
  // de pantalla), la mostramos a pantalla completa en vez de con margen arriba/abajo.
  const screenRatio = SCREEN_WIDTH / SCREEN_HEIGHT;
  const imageRatio = naturalSize ? naturalSize.width / naturalSize.height : null;
  const isScreenFormat = imageRatio !== null && Math.abs(imageRatio - screenRatio) < 0.03;
  const imageHeight = isScreenFormat ? SCREEN_HEIGHT : mediaHeight;

  // El listener del acelerómetro se registra una sola vez, así que necesitamos
  // un ref para poder leer el imageHeight más reciente dentro de ese callback.
  const imageHeightRef = useRef(imageHeight);
  useEffect(() => {
    imageHeightRef.current = imageHeight;
  }, [imageHeight]);

    useEffect(() => {
      if (!isActive) {
        try { if (player && item.type === 'video') player.pause(); } catch (_) {}
        resetZoom();
      }
      return () => {
        try { if (player && item.type === 'video') player.pause(); } catch (_) {}
      };
    }, [isActive]);

  useEffect(() => {
    onZoomChange?.(zoomed);
  }, [zoomed]);

  // Suscripción al acelerómetro: solo mientras la página de imagen esté activa.
  // Detecta hacia qué lado quedó el celular (izquierda/derecha/boca abajo) y
  // rota la imagen para "compensar", como hace la app de Fotos nativa.
  useEffect(() => {
    if (item.type !== 'image' || !isActive) return;

    Accelerometer.setUpdateInterval(200);
    const subscription = Accelerometer.addListener(({ x, y }) => {
      const magnitude = Math.sqrt(x * x + y * y);
      if (magnitude < TILT_THRESHOLD) return; // celular casi plano, ignoramos

      const angleRad = Math.atan2(-x, y);
      const angleDeg = angleRad * (180 / Math.PI);

      // Redondeamos a la posición más cercana entre 0°, 90°, 180°, -90°
      let snapped = Math.round(angleDeg / 90) * 90;
      if (snapped === -180) snapped = 180;

      if (snapped !== currentAngleRef.current) {
        currentAngleRef.current = snapped;
        // Invertimos el signo: la convención de ejes del acelerómetro queda
        // "al revés" respecto a como Animated interpreta un rotate positivo.
        Animated.spring(rotation, {
          toValue: -snapped,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();

        // Si quedó "de costado" (90° o -90°), el alto de la imagen pasa a ocupar
        // el ancho de la pantalla. Si la imagen es muy alta, eso no entra, así que
        // calculamos cuánto hay que achicarla para que quepa completa.
        const isSideways = Math.abs(snapped) === 90;
        let targetScale = 1;
        if (isSideways) {
          const Hc = imageHeightRef.current; // alto actual del contenedor (vertical)
          const Wc = SCREEN_WIDTH; // ancho actual del contenedor
          targetScale = Math.min(SCREEN_WIDTH / Hc, mediaHeight / Wc, 1);
        }
        Animated.spring(orientationScale, {
          toValue: targetScale,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isActive, item.type]);

  // Si dejamos de ver la imagen, la volvemos a dejar derecha (y a tamaño normal) para la próxima vez.
  useEffect(() => {
    if (!isActive) {
      currentAngleRef.current = 0;
      rotation.setValue(0);
      orientationScale.setValue(1);
    }
  }, [isActive]);

  const resetZoom = () => {
    lastScaleValue.current = 1;
    lastOffset.current = { x: 0, y: 0 };
    baseScale.setValue(1);
    pinchScale.setValue(1);
    translateX.setOffset(0);
    translateX.setValue(0);
    translateY.setOffset(0);
    translateY.setValue(0);
    setZoomed(false);
  };

  // Calcula cuánto se puede mover la imagen en cada eje sin dejar ver "el borde"
  // (la mitad del extra de tamaño que agrega el zoom respecto al tamaño original).
  const getMaxOffset = (scaleValue) => {
    const currentHeight = item.type === 'image' && isScreenFormat ? SCREEN_HEIGHT : mediaHeight;
    return {
      maxX: Math.max(0, (SCREEN_WIDTH * (scaleValue - 1)) / 2),
      maxY: Math.max(0, (currentHeight * (scaleValue - 1)) / 2),
    };
  };

  // Recorta lastOffset dentro de los límites válidos para el scale actual
  // y aplica el resultado a los Animated.Value (sin animación, es instantáneo).
  const clampOffset = (scaleValue) => {
    const { maxX, maxY } = getMaxOffset(scaleValue);
    const clampedX = Math.max(-maxX, Math.min(lastOffset.current.x, maxX));
    const clampedY = Math.max(-maxY, Math.min(lastOffset.current.y, maxY));
    lastOffset.current = { x: clampedX, y: clampedY };
    translateX.setOffset(clampedX);
    translateX.setValue(0);
    translateY.setOffset(clampedY);
    translateY.setValue(0);
  };

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: true }
  );

  const onPinchStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      let newScale = lastScaleValue.current * event.nativeEvent.scale;
      newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));
      lastScaleValue.current = newScale;
      baseScale.setValue(newScale);
      pinchScale.setValue(1);
      if (newScale <= 1.02) {
        resetZoom();
      } else {
        setZoomed(true);
        clampOffset(newScale); // si veníamos movidos y el nuevo scale achica el margen, lo recorta
      }
    }
  };

  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onPanStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastOffset.current.x += event.nativeEvent.translationX;
      lastOffset.current.y += event.nativeEvent.translationY;
      clampOffset(lastScaleValue.current);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      if (zoomed) {
        resetZoom();
      } else {
        lastScaleValue.current = 2.5;
        baseScale.setValue(2.5);
        setZoomed(true);
      }
    }
    lastTapRef.current = now;
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: ['-180deg', '0deg', '180deg'],
  });

  // Escala total = zoom manual (pinch/doble-tap) combinado con el achique automático
  // por orientación (que solo entra en juego cuando la imagen está de costado).
  const totalScale = Animated.multiply(scale, orientationScale);

  // El orden acá es clave: translateX/Y deben ir ANTES que rotate en la lista para que
  // el arrastre (pan) se aplique siempre en coordenadas de pantalla, sin importar el
  // ángulo actual de rotación de la imagen. Si rotate va antes, el desplazamiento del
  // dedo termina "rotado" junto con la imagen y el drag se siente invertido/cruzado.
  const zoomStyle = {
    transform: [{ translateX }, { translateY }, { rotate: rotateInterpolate }, { scale: totalScale }],
  };

  if (item.type === 'video') {
    return (
      <View style={styles.mediaViewerPage}>
        <PinchGestureHandler
          ref={pinchRef}
          simultaneousHandlers={panRef}
          onGestureEvent={onPinchEvent}
          onHandlerStateChange={onPinchStateChange}
        >
          <Animated.View>
            <PanGestureHandler
              ref={panRef}
              simultaneousHandlers={pinchRef}
              enabled={zoomed}
              onGestureEvent={onPanEvent}
              onHandlerStateChange={onPanStateChange}
            >
              <Animated.View style={[{ width: SCREEN_WIDTH, height: mediaHeight }, zoomStyle]}>
                <VideoView
                  player={player}
                  style={{ width: '100%', height: '100%' }}
                  nativeControls
                    allowsFullscreen={false}
                  contentFit="contain"
                />
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
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
      <PinchGestureHandler
        ref={pinchRef}
        simultaneousHandlers={panRef}
        onGestureEvent={onPinchEvent}
        onHandlerStateChange={onPinchStateChange}
      >
        <Animated.View>
          <PanGestureHandler
            ref={panRef}
            simultaneousHandlers={pinchRef}
            enabled={zoomed}
            onGestureEvent={onPanEvent}
            onHandlerStateChange={onPanStateChange}
          >
            <Animated.View>
              <Pressable onPress={handleDoubleTap}>
                <Animated.Image
                  source={{ uri: item.mediaUrl }}
                  style={[{ width: SCREEN_WIDTH, height: imageHeight }, zoomStyle]}
                  resizeMode={isScreenFormat ? 'cover' : 'contain'}
                  onLoad={(e) => {
                    const { width, height } = e.nativeEvent.source;
                    setNaturalSize({ width, height });
                  }}
                />
              </Pressable>
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </PinchGestureHandler>
    </View>
  );
};

// Modal con swipe horizontal entre todas las fotos/videos/archivos del chat
const MediaViewerModal = ({ visible, items, initialIndex, onClose }) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex || 0);
      setScrollEnabled(true);
    }
  }, [visible, initialIndex]);

  const handleScrollEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(idx);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.mediaViewerContainer}>
          <View style={[styles.mediaViewerHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={onClose} style={styles.mediaViewerCloseBtn}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.mediaViewerCounter}>
              {items.length > 0 ? `${currentIndex + 1} / ${items.length}` : ''}
            </Text>
          </View>

          {visible && (
            <FlatList
              data={items}
              keyExtractor={(it) => it.id}
              horizontal
              pagingEnabled
              scrollEnabled={scrollEnabled}
              initialScrollIndex={initialIndex || 0}
              getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
              onMomentumScrollEnd={handleScrollEnd}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <MediaViewerItem
                  item={item}
                  isActive={index === currentIndex}
                  insets={insets}
                  onZoomChange={(isZoomed) => {
                    if (index === currentIndex) setScrollEnabled(!isZoomed);
                  }}
                />
              )}
            />
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

export default MediaViewerModal;