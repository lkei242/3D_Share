import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, Animated, Image, Linking, PanResponder } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { GREEN_ACCENT, getVideoThumbnail } from './Chatconstants';
import styles from './Chatstyles';
import AudioPlayer from './Audioplayer';

// Burbuja de mensaje individual: texto, audio, ubicación, imagen, video,
// archivo o grupo de medias. Memoizado porque la lista puede tener muchos mensajes.
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
  onOpenMedia,
  onSwipeReply,
  otherProfilePicture,
  myProfilePicture,
  isEditing,
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

  // --- Swipe-to-reply (deslizar el mensaje hacia la derecha, como WhatsApp) ---
  const swipeX = useRef(new Animated.Value(0)).current;
  const replyIconOpacity = useRef(new Animated.Value(0)).current;

  // El PanResponder se crea una sola vez (useRef), así que guardamos los props
  // "vivos" en un ref aparte para que sus callbacks no queden con valores viejos
  // de item/selectedIds/onSwipeReply de la primera renderización.
  const liveRef = useRef({ item, selectedIds, onSwipeReply });
  useEffect(() => {
    liveRef.current = { item, selectedIds, onSwipeReply };
  });

  const MAX_SWIPE = 68;
  const TRIGGER_THRESHOLD = 48;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      // Solo "roba" el gesto de la lista/Pressable si el movimiento es
      // claramente horizontal hacia la derecha (evita interferir con el
      // scroll vertical del FlatList o con el tap/long-press normal).
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (liveRef.current.selectedIds.length > 0) return false; // no deslizar en modo selección
        const { dx, dy } = gestureState;
        return dx > 12 && dx > Math.abs(dy) * 2;
      },
      onPanResponderMove: (_, gestureState) => {
        const dx = Math.max(0, Math.min(gestureState.dx, MAX_SWIPE));
        swipeX.setValue(dx);
        replyIconOpacity.setValue(Math.min(dx / TRIGGER_THRESHOLD, 1));
      },
      onPanResponderRelease: (_, gestureState) => {
        const triggered = gestureState.dx > TRIGGER_THRESHOLD;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: false, speed: 20, bounciness: 6 }).start();
        Animated.timing(replyIconOpacity, { toValue: 0, duration: 150, useNativeDriver: false }).start();
        if (triggered && liveRef.current.onSwipeReply) {
          liveRef.current.onSwipeReply(liveRef.current.item);
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
        Animated.timing(replyIconOpacity, { toValue: 0, duration: 150, useNativeDriver: false }).start();
      },
    })
  ).current;

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
    <View style={{ width: '100%' }} {...panResponder.panHandlers}>
      {/* Ícono de responder que aparece detrás de la burbuja al deslizar */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.replyIconWrap,
          {
            opacity: replyIconOpacity,
            transform: [{
              scale: replyIconOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
            }],
          },
        ]}
      >
        <Ionicons name="arrow-undo" size={20} color={isDark ? '#999' : '#777'} />
      </Animated.View>

    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={450}
      style={{ width: '100%' }}
    >
      <Animated.View style={[
        isMe ? styles.myMessageRow : styles.otherMessageRow,
        isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
        { backgroundColor: rowBgColor, transform: [{ translateX: swipeX }] },
        isEditing && { backgroundColor: 'rgba(255,193,7,0.18)' },
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
          <View style={[
            styles.bubbleAvatarCircle, 
            { 
              marginRight: 8, 
              marginHorizontal: 0,
              backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0',
              borderColor: isDark ? '#222' : '#E0E0E0',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
            }
          ]}>
            {otherProfilePicture ? (
              <Image source={{ uri: otherProfilePicture }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Ionicons
                name="person-circle-outline"
                size={28} // Tamaño idéntico al círculo (32)
                color="#94BA46"
              />
            )}
          </View>
        )}

        <Animated.View style={[
          isMe ? styles.myMessageBubble : styles.otherMessageBubble,
          { backgroundColor: isMe ? myBubbleBgColor : otherBubbleBgColor },
          isMe ? { borderBottomRightRadius: 2 } : { borderBottomLeftRadius: 2 },
        ]}>
        {!!item.replyTo && (
          <View style={[styles.replyQuoteBox, { backgroundColor: isMe ? 'rgba(255,255,255,0.16)' : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') }]}>
            <View style={[styles.replyQuoteAccent, { backgroundColor: isMe ? '#FFF' : GREEN_ACCENT }]} />
            <View style={styles.replyQuoteContent}>
              <Text
                style={[styles.replyQuoteSender, { color: isMe ? '#FFF' : GREEN_ACCENT }]}
                numberOfLines={1}
              >
                {item.replyTo.senderName || 'Mensaje'}
              </Text>
              <Text
                style={[styles.replyQuoteText, { color: isMe ? 'rgba(255,255,255,0.85)' : (isDark ? '#CCC' : '#555') }]}
                numberOfLines={1}
              >
                {item.replyTo.text}
              </Text>
            </View>
          </View>
        )}
        {item.type === 'audio' ? (
          <AudioPlayer url={item.mediaUrl} duration={item.audioDuration} isMe={isMe} colors={colors} />
        ) : item.type === 'location' ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${item.latitude},${item.longitude}`)}
            style={{ borderRadius: 12, overflow: 'hidden', width: 260, marginHorizontal: -10, marginTop: -6 }}
          >
            <View style={{ width: 260, height: 190, overflow: 'hidden' }} pointerEvents="none">
              <WebView
                style={{ flex: 1 }}
                scrollEnabled={false}
                pointerEvents="none"
                source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><style>*{margin:0;padding:0}html,body,#map{width:100%;height:100%;overflow:hidden}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>var map=L.map('map',{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,keyboard:false}).setView([${item.latitude},${item.longitude}],15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);L.marker([${item.latitude},${item.longitude}]).addTo(map);</script></body></html>` }}
              />
            </View>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 4,
              paddingHorizontal: 10,
              gap: 6,
              backgroundColor: isMe ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)',
            }}>
              <Ionicons name="location" size={16} color={isMe ? '#FFF' : GREEN_ACCENT} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Nunito-Bold', color: isMe ? '#FFF' : colors.text }} numberOfLines={1}>
                  {item.locationName || 'Ubicación'}
                </Text>
                {!!item.locationAddress && (
                  <Text style={{ fontSize: 11, fontFamily: 'Nunito-Regular', color: isMe ? 'rgba(255,255,255,0.75)' : '#888' }} numberOfLines={1}>
                    {item.locationAddress}
                  </Text>
                )}
              </View>
              <Ionicons name="open-outline" size={13} color={isMe ? 'rgba(255,255,255,0.6)' : '#AAA'} />
            </View>
          </TouchableOpacity>
          ) : item.type === 'media_group' ? (
            (() => {
              const items = item.mediaItems || [];
              const count = items.length;
              const maxVisible = Math.min(count, 4);
              const visibleItems = items.slice(0, maxVisible);
              const extraCount = count > 4 ? count - 4 : 0;
              const isWide = count >= 3;

              return (
                <View style={{ borderRadius: 10, overflow: 'hidden', marginHorizontal: -10, marginTop: -6 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, width: 260 }}>
                    {visibleItems.map((mi, idx) => {
                      const isLast = idx === maxVisible - 1 && extraCount > 0;
                      const w = count === 1 ? 220 : count === 2 ? 129 : idx === 0 && count === 3 ? 260 : 129;
                      const h = count === 1 ? 220 : count === 2 ? 160 : 129;
                      return (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.85}
                          style={{ width: w, height: h, position: 'relative' }}
                          onPress={() => {
                            if (selectedIds.length > 0) {
                              onToggleSelect(item.id);
                            } else {
                              // Abre el visor directamente en la foto tocada dentro del grupo
                              onOpenMedia(item, idx);
                            }
                          }}
                        >
                          <Image
                            source={{ uri: mi.type === 'video' ? getVideoThumbnail(mi.url) : mi.url }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                          {mi.type === 'video' && (
                            <View style={[styles.mediaPlayOverlay, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                              <Ionicons name="play-circle" size={28} color="#FFF" />
                            </View>
                          )}
                          {isLast && (
                            <View style={[styles.mediaPlayOverlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                              <Text style={{ color: '#FFF', fontSize: 22, fontWeight: 'bold' }}>+{extraCount}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {!!item.caption && (
                    <Text style={{ fontSize: 14, fontFamily: 'Nunito-Regular', color: isMe ? '#FFF' : colors.text, paddingHorizontal: 4, paddingTop: 4 }}>
                      {item.caption}
                    </Text>
                  )}
                </View>
              );
            })()
          ) : item.type === 'image' ? (
            <TouchableOpacity onPress={handleMediaPress} activeOpacity={0.85}>
              <Image
                source={{ uri: item.mediaUrl }}
                style={[styles.mediaThumb, { marginHorizontal: -10, marginTop: -6 }]}
                resizeMode="cover"
              />
              {!!item.caption && (
                <Text style={{ fontSize: 14, fontFamily: 'Nunito-Regular', color: isMe ? '#FFF' : colors.text, paddingTop: 4 }}>
                  {item.caption}
                </Text>
              )}
            </TouchableOpacity>
          ) : item.type === 'video' ? (
            <TouchableOpacity onPress={handleMediaPress} activeOpacity={0.85}>
              <Image
                source={{ uri: getVideoThumbnail(item.mediaUrl) }}
                style={[styles.mediaThumb, { marginHorizontal: -10, marginTop: -6 }]}
                resizeMode="cover"
              />
              <View style={styles.mediaPlayOverlay}>
                <Ionicons name="play-circle" size={42} color="#FFF" />
              </View>
              {!!item.caption && (
                <Text style={{ fontSize: 14, fontFamily: 'Nunito-Regular', color: isMe ? '#FFF' : colors.text, paddingTop: 4 }}>
                  {item.caption}
                </Text>
              )}
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
                        {isMe && <Ionicons name={item.read ? "checkmark-done" : (item.delivered ? "checkmark-done" : "checkmark")} size={14} color={item.read ? '#FFEE00' : (item.delivered ? '#E1E1E1' : '#E1E1E1')} style={{ marginLeft: 4 }} />}
          </View>
        </Animated.View>

        {isMe && (
          <View style={[
            styles.bubbleAvatarCircle, 
            { 
              marginLeft: 8, 
              marginHorizontal: 0,
              backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0',
              borderColor: isDark ? '#222' : '#E0E0E0',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
            }
          ]}>
            {myProfilePicture ? (
              <Image source={{ uri: myProfilePicture }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Ionicons
                name="person-circle-outline"
                size={28.5}
                color="#94BA46"
              />
            )}
          </View>
        )}
      </Animated.View>
    </Pressable>
    </View>
  );
}, (prev, next) => 
  prev.item.id === next.item.id && 
  prev.item.text === next.item.text && 
  prev.isEditing === next.isEditing &&
  prev.item.caption === next.item.caption &&
  prev.item.read === next.item.read && 
  prev.item.delivered === next.item.delivered &&
  prev.item.pending === next.item.pending &&
  prev.item.isFavorite === next.item.isFavorite && 
  prev.item.time === next.item.time && 
  prev.item.replyTo?.id === next.item.replyTo?.id && 
  prev.isChecked === next.isChecked && 
  prev.isDark === next.isDark &&
  prev.otherProfilePicture === next.otherProfilePicture &&
  prev.myProfilePicture === next.myProfilePicture &&  
  (prev.selectedIds.length > 0) === (next.selectedIds.length > 0)
);

export default MessageItem;