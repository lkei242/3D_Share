import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, Animated, Image, Linking } from 'react-native';
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
        ) : item.type === 'location' ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${item.latitude},${item.longitude}`)}
            style={{ borderRadius: 12, overflow: 'hidden', width: 240 }}
          >
            <View style={{ width: 240, height: 140, overflow: 'hidden' }} pointerEvents="none">
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
              paddingVertical: 8,
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
  prev.item.time === next.item.time && 
  prev.isChecked === next.isChecked && 
  prev.isDark === next.isDark &&
  (prev.selectedIds.length > 0) === (next.selectedIds.length > 0)
);

export default MessageItem;