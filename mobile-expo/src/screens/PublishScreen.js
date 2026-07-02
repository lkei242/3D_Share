// src/screens/PublishScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { auth, db } from './config/firebase';
import { API_URL } from './config/api';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 4;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * 4) / 3;

// ============================================================
// COMPONENTE: MediaPreviewItem (preview individual con video autoplay)
// ============================================================
const MediaPreviewItem = React.memo(function MediaPreviewItem({ item, onRemove, index }) {
  const isVideo = item.type === 'video';

  // Hook de video para previsualización (muted, loop, autoplay)
  const player = useVideoPlayer(item.uri, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
    playerInstance.play();
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.mediaItem,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {isVideo ? (
        <VideoView
          player={player}
          style={styles.mediaImage}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          nativeControls={false}
        />
      ) : (
        <Image source={{ uri: item.uri }} style={styles.mediaImage} resizeMode="cover" />
      )}

      {/* Badge de tipo (video) */}
      {isVideo && (
        <View style={styles.videoBadge}>
          <MaterialCommunityIcons name="video" size={12} color="#FFF" />
        </View>
      )}

      {/* Badge de número de orden */}
      <View style={styles.orderBadge}>
        <Text style={styles.orderBadgeText}>{index + 1}</Text>
      </View>

      {/* Botón de quitar */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(index)}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={16} color="#FFF" />
      </TouchableOpacity>
    </Animated.View>
  );
});

// ============================================================
// COMPONENTE PRINCIPAL: PublishScreen
// ============================================================
export default function PublishScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [webLink, setWebLink] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    setToastType(type);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToastMessage(''));
    }, 3000);
  };

  // ============================================================
  // SELECCIÓN DE MEDIA (fotos + videos)
  // ============================================================
  const pickMedia = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permisos requeridos',
          'Necesitamos acceso a tu galería para seleccionar fotos y videos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: 10 - mediaItems.length, // límite de 10 en total
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newItems = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type || 'image',
          duration: asset.duration || 0,
          width: asset.width,
          height: asset.height,
        }));

        setMediaItems((prev) => {
          const combined = [...prev, ...newItems];
          if (combined.length > 10) {
            showToast('Máximo 10 archivos por publicación', 'error');
            return combined.slice(0, 10);
          }
          return combined;
        });
      }
    } catch (error) {
      console.log('Error seleccionando media:', error);
      showToast('Error al seleccionar archivos', 'error');
    }
  };

  const removeMedia = (index) => {
    Animated.timing(toastAnim, {
      toValue: toastAnim._value,
      duration: 0,
      useNativeDriver: true,
    }).start();
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ============================================================
  // VALIDACIONES
  // ============================================================
  const validateWebLink = (url) => {
    if (!url.trim()) return null;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'El enlace debe comenzar con http:// o https://';
      }
      if (!parsed.hostname.includes('.')) {
        return 'El enlace no tiene un formato válido';
      }
      return null;
    } catch {
      return 'El enlace no tiene un formato válido';
    }
  };

  // ============================================================
  // UPLOAD
  // ============================================================
  const uploadSingleFile = async (uri, fileType, token) => {
    const formData = new FormData();
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function () {
        reject(new TypeError('Error al leer el archivo.'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });

    const filename = uri.split('/').pop() || 'file';
    formData.append('imagen', blob, filename);

    const res = await fetch(`${API_URL}/api/media/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al subir archivo');
    return data.url;
  };

  // ============================================================
  // PUBLICAR
  // ============================================================
  const handlePublish = async () => {
    if (!titulo.trim()) {
      showToast('Por favor ingresa un título');
      return;
    }
    if (mediaItems.length === 0) {
      showToast('Agregá al menos una foto o video');
      return;
    }
    const linkError = validateWebLink(webLink);
    if (linkError) {
      showToast(linkError);
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        showToast('Debes estar autenticado para publicar');
        setLoading(false);
        return;
      }
      const token = await user.getIdToken();

      const uploadedMedia = [];
      const uploadedUrls = [];
      for (const item of mediaItems) {
        const url = await uploadSingleFile(item.uri, item.type, token);
        uploadedMedia.push({ url, type: item.type });
        uploadedUrls.push(url);
      }

      await addDoc(collection(db, 'posts'), {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        precio: precio.trim() ? parseFloat(precio.trim()) : null,
        webLink: webLink.trim() || null,
        imagenes: uploadedUrls,
        media: uploadedMedia,
        autor: user.uid,
        vistas: 0,
        createdAt: serverTimestamp(),
      });

      showToast('¡Publicación creada con éxito!', 'success');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      console.log('Error publicando post:', error);
      showToast('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  const hasMedia = mediaItems.length > 0;
  const canAddMore = mediaItems.length < 10;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: isDark ? '#0B0B0B' : '#F5F5F5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nueva publicación</Text>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={loading || !hasMedia || !titulo.trim()}
          style={[
            styles.publishHeaderButton,
            {
              backgroundColor: loading || !hasMedia || !titulo.trim() ? '#3a4d14' : '#9DBD3F',
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.publishHeaderButtonText}>Compartir</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraScrollHeight={100}
        enableOnAndroid
      >
        {/* GRID DE MEDIA */}
        <View style={styles.mediaGridContainer}>
          <View style={styles.mediaGrid}>
            {mediaItems.map((item, index) => (
              <MediaPreviewItem
                key={`${item.uri}-${index}`}
                item={item}
                index={index}
                onRemove={removeMedia}
              />
            ))}

            {/* Botón agregar (si hay espacio) */}
            {canAddMore && (
              <TouchableOpacity
                style={[
                  styles.addMediaButton,
                  {
                    backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0',
                    borderColor: isDark ? '#2D2D2D' : '#D0D0D0',
                  },
                ]}
                onPress={pickMedia}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={36} color="#9DBD3F" />
                <Text style={[styles.addMediaText, { color: isDark ? '#888' : '#666' }]}>
                  {hasMedia ? 'Agregar más' : 'Agregar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Contador + info */}
          {hasMedia && (
            <View style={styles.mediaInfoRow}>
              <View style={styles.mediaInfoLeft}>
                <MaterialCommunityIcons name="image-multiple" size={16} color={isDark ? '#888' : '#666'} />
                <Text style={[styles.mediaInfoText, { color: isDark ? '#888' : '#666' }]}>
                  {mediaItems.length} / 10
                </Text>
              </View>
              <Text style={[styles.mediaInfoHint, { color: isDark ? '#666' : '#999' }]}>
                La primera imagen será la portada
              </Text>
            </View>
          )}
        </View>

        {/* FORMULARIO */}
        <View style={styles.formContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Título *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: isDark ? '#2C2C2C' : '#E0E0E0',
              },
            ]}
            placeholder="Ej: Soporte articulado para tableta"
            placeholderTextColor="#707070"
            value={titulo}
            onChangeText={setTitulo}
            maxLength={80}
          />

          <Text style={[styles.label, { color: colors.text }]}>Descripción (Opcional)</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: isDark ? '#2C2C2C' : '#E0E0E0',
              },
            ]}
            placeholder="Describe los detalles de tu pieza 3D, material, tiempo, etc..."
            placeholderTextColor="#707070"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
            maxLength={500}
          />

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: colors.text }]}>Precio ($)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: isDark ? '#2C2C2C' : '#E0E0E0',
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor="#707070"
                value={precio}
                onChangeText={setPrecio}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: colors.text }]}>Enlace web</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: isDark ? '#2C2C2C' : '#E0E0E0',
                  },
                ]}
                placeholder="https://..."
                placeholderTextColor="#707070"
                value={webLink}
                onChangeText={setWebLink}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Botón publicar grande (abajo también) */}
          <TouchableOpacity
            style={[
              styles.publishButton,
              {
                backgroundColor: loading || !hasMedia || !titulo.trim() ? '#3a4d14' : '#546F1C',
              },
            ]}
            onPress={handlePublish}
            disabled={loading || !hasMedia || !titulo.trim()}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.publishButtonContent}>
                <Feather name="send" size={18} color="#FFF" />
                <Text style={styles.publishButtonText}>Publicar</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* TOAST */}
      {toastMessage !== '' && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: toastType === 'success' ? '#27AE60' : '#E74C3C',
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons
            name={toastType === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color="#FFF"
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Nunito-Bold',
  },
  publishHeaderButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  publishHeaderButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  // GRID DE MEDIA
  mediaGridContainer: {
    paddingVertical: 12,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 2,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: GRID_GAP / 2,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  orderBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: 'Nunito-Bold',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  addMediaButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: GRID_GAP / 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addMediaText: {
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
  },
  mediaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  mediaInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mediaInfoText: {
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
  },
  mediaInfoHint: {
    fontSize: 11,
    fontFamily: 'Nunito-Regular',
  },
  // FORM
  formContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
    borderWidth: 1,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  publishButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  publishButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publishButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  // TOAST
  toast: {
    position: 'absolute',
    top: 70,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    flex: 1,
  },
});