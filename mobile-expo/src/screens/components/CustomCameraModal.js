import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  Alert,
  Dimensions,
  PanResponder,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import * as ImageManipulator from 'expo-image-manipulator';
import ViewShot from 'react-native-view-shot';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const TextItem = ({ item, onUpdatePosition, onPress }) => {
  const startX = useRef(item.x);
  const startY = useRef(item.y);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startX.current = item.x;
        startY.current = item.y;
      },
      onPanResponderMove: (evt, gestureState) => {
        onUpdatePosition(startX.current + gestureState.dx, startY.current + gestureState.dy);
      },
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[styles.textItem, { left: item.x, top: item.y }]}
    >
      <TouchableOpacity onPress={onPress}>
        <Text style={[styles.textItemText, { color: item.color }]}>{item.text}</Text>
      </TouchableOpacity>
    </View>
  );
};

const VideoPreview = ({ uri }) => {
  const player = useVideoPlayer(uri, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.play();
  });

  return (
    <VideoView
      style={styles.mediaPreview}
      player={player}
      allowsFullscreen={false}
      showsPlaybackControls={false}
    />
  );
};

export default function CustomCameraModal({ visible, onClose, onSend }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [currentStep, setCurrentStep] = useState('camera'); 
  const [activeTab, setActiveTab] = useState('foto'); 
  const [cameraMode, setCameraMode] = useState('picture'); 
  const [flash, setFlash] = useState('off');
  const [facing, setFacing] = useState('back');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFromLongPress, setRecordingFromLongPress] = useState(false);
  
  
  const [capturedMedia, setCapturedMedia] = useState([]); 
  const [activeIdx, setActiveIdx] = useState(0);

  
  const [editorMode, setEditorMode] = useState('none'); 
  const [paths, setPaths] = useState([]); 
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#25D366');
  
  
  const [texts, setTexts] = useState([]); 
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [editingTextId, setEditingTextId] = useState(null);
  
  const cameraRef = useRef(null);
  const viewShotRef = useRef(null);

  useEffect(() => {
    if (visible) {
      requestPermission();
      requestMicPermission();
      setCurrentStep('camera');
      setCapturedMedia([]);
      setActiveIdx(0);
      resetEditorState();
    }
  }, [visible]);

  useEffect(() => {
    setCameraMode(activeTab === 'video' ? 'video' : 'picture');
  }, [activeTab]);

  const resetEditorState = () => {
    setPaths([]);
    setTexts([]);
    setEditorMode('none');
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Se requieren permisos de cámara para continuar.</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Otorgar Permisos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  
  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });
        const newItem = { uri: photo.uri, type: 'image', caption: '' };
        const newList = [...capturedMedia, newItem];
        setCapturedMedia(newList);
        setActiveIdx(newList.length - 1);
        resetEditorState();
        setCurrentStep('editor');
      } catch (e) {
        Alert.alert('Error', 'No se pudo tomar la foto.');
      }
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;

    
    
    let hasMicPermission = micPermission?.granted;
    if (!hasMicPermission) {
      const result = await requestMicPermission();
      hasMicPermission = result?.granted;
    }
    if (!hasMicPermission) {
      Alert.alert(
        'Permiso requerido',
        'Se necesita acceso al micrófono para grabar video.'
      );
      return;
    }

    try {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });
      const newItem = { uri: video.uri, type: 'video', caption: '' };
      const newList = [...capturedMedia, newItem];
      setCapturedMedia(newList);
      setActiveIdx(newList.length - 1);
      resetEditorState();
      setCurrentStep('editor');
    } catch (e) {
      console.log('Error grabando video:', e);
      Alert.alert('Error', 'No se pudo grabar el video.');
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  const handleCapturePress = async () => {
    if (activeTab === 'video') {
      if (isRecording) {
        stopRecording();
      } else {
        await startRecording();
      }
    } else {
      await takePhoto();
    }
  };

  const handleCaptureLongPress = async () => {
    if (activeTab === 'foto') {
      setRecordingFromLongPress(true);
      setCameraMode('video');
      setTimeout(async () => {
        await startRecording();
      }, 100);
    }
  };

  const handleCapturePressOut = () => {
    if (recordingFromLongPress) {
      setRecordingFromLongPress(false);
      stopRecording();
      setCameraMode('picture');
    }
  };

  
  const handleTouchStart = (e) => {
    if (editorMode !== 'draw') return;
    const { locationX, locationY } = e.nativeEvent;
    setIsDrawing(true);
    setPaths(prev => [...prev, { color: brushColor, points: [`M ${locationX} ${locationY}`] }]);
  };

  const handleTouchMove = (e) => {
    if (editorMode !== 'draw' || !isDrawing) return;
    const { locationX, locationY } = e.nativeEvent;
    setPaths(prev => {
      const newPaths = [...prev];
      const current = newPaths[newPaths.length - 1];
      if (current) {
        current.points.push(`L ${locationX} ${locationY}`);
      }
      return newPaths;
    });
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  const handleAddText = () => {
    setEditingTextId(null);
    setTextInputValue('');
    setShowTextInput(true);
  };

  const handleSaveText = () => {
    if (!textInputValue.trim()) {
      setShowTextInput(false);
      return;
    }
    if (editingTextId) {
      setTexts(prev => prev.map(t => t.id === editingTextId ? { ...t, text: textInputValue } : t));
    } else {
      setTexts(prev => [...prev, {
        id: Date.now().toString(),
        text: textInputValue,
        x: screenWidth / 2 - 50,
        y: screenHeight / 3,
        color: brushColor,
      }]);
    }
    setShowTextInput(false);
  };

  const handleCrop = async (ratio) => {
    const activeItem = capturedMedia[activeIdx];
    if (!activeItem || activeItem.type === 'video') return;

    try {
      Image.getSize(activeItem.uri, async (width, height) => {
        let cropWidth = width;
        let cropHeight = height;
        let originX = 0;
        let originY = 0;

        if (ratio) {
          if (width / height > ratio) {
            cropWidth = height * ratio;
            originX = (width - cropWidth) / 2;
          } else {
            cropHeight = width / ratio;
            originY = (height - cropHeight) / 2;
          }
        }

        const result = await ImageManipulator.manipulateAsync(
          activeItem.uri,
          [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );

        setCapturedMedia(prev => prev.map((item, idx) => idx === activeIdx ? { ...item, uri: result.uri } : item));
        setEditorMode('none');
      });
    } catch (e) {
      console.log('Error recortando:', e);
    }
  };

  const handleSendAll = async () => {
    const finalMedia = [];
    for (let i = 0; i < capturedMedia.length; i++) {
      const item = capturedMedia[i];
      if (item.type === 'image' && (paths.length > 0 || texts.length > 0)) {
        try {
          if (i === activeIdx && viewShotRef.current) {
            const uri = await viewShotRef.current.capture();
            finalMedia.push({ ...item, uri });
          } else {
            finalMedia.push(item);
          }
        } catch (e) {
          finalMedia.push(item);
        }
      } else {
        finalMedia.push(item);
      }
    }
    onSend(finalMedia);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.modalContainer}>
        {currentStep === 'camera' ? (
          
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              flash={flash}
              mode={cameraMode}
            />

            {}
            <View style={styles.topControls}>
              <TouchableOpacity onPress={() => {
                if (capturedMedia.length > 0) {
                  Alert.alert('Descartar', '¿Descartar todas las fotos tomadas?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Descartar', style: 'destructive', onPress: () => onClose() },
                  ]);
                } else {
                  onClose();
                }
              }}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleFlash}>
                <Ionicons name={flash === 'on' ? "flash" : "flash-off"} size={26} color="#FFF" />
              </TouchableOpacity>
            </View>

            {}
            <View style={styles.bottomSection}>
              {}
              <View style={styles.bottomControls}>
                {}
                {capturedMedia.length > 0 ? (
                  <TouchableOpacity style={styles.galleryPreview} onPress={() => setCurrentStep('editor')}>
                    <Image source={{ uri: capturedMedia[capturedMedia.length - 1].uri }} style={styles.galleryThumb} />
                    <View style={styles.galleryBadge}>
                      <Text style={styles.galleryBadgeText}>{capturedMedia.length}</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.galleryPlaceholder} />
                )}

                {}
                <TouchableOpacity
                  onPress={handleCapturePress}
                  onLongPress={handleCaptureLongPress}
                  onPressOut={handleCapturePressOut}
                  style={styles.captureRing}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.captureCenter,
                    { backgroundColor: isRecording ? '#FF3B30' : '#94BA46' }
                  ]} />
                </TouchableOpacity>

                {}
                <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')} style={styles.flipBtn}>
                  <Ionicons name="camera-reverse" size={28} color="#FFF" />
                </TouchableOpacity>
              </View>

              {}
              <View style={styles.tabContainer}>
                <TouchableOpacity onPress={() => setActiveTab('video')} style={styles.tabItem}>
                  <Text style={[styles.tabText, activeTab === 'video' && styles.tabTextActive]}>Video</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('foto')} style={styles.tabItem}>
                  <Text style={[styles.tabText, activeTab === 'foto' && styles.tabTextActive]}>Foto</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.editorContainer}>
            {}
            <View style={styles.editorHeader}>
              <TouchableOpacity onPress={() => {
                Alert.alert('Descartar', '¿Descartar todas las fotos tomadas?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Descartar', style: 'destructive', onPress: () => onClose() },
                ]);
              }}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>

              <View style={styles.editorTools}>
                {capturedMedia[activeIdx]?.type === 'image' && (
                  <>
                    <TouchableOpacity onPress={() => setEditorMode(e => e === 'crop' ? 'none' : 'crop')}>
                      <MaterialCommunityIcons name="crop" size={26} color={editorMode === 'crop' ? '#25D366' : '#FFF'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddText}>
                      <Text style={[styles.textToolIcon, editorMode === 'text' && { color: '#25D366' }]}>Aa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditorMode(e => e === 'draw' ? 'none' : 'draw')}>
                      <Feather name="edit-2" size={24} color={editorMode === 'draw' ? '#25D366' : '#FFF'} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {}
            {editorMode === 'crop' && (
              <View style={styles.cropMenu}>
                <TouchableOpacity onPress={() => handleCrop(null)} style={styles.cropItem}>
                  <Text style={styles.cropText}>Libre</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCrop(1)} style={styles.cropItem}>
                  <Text style={styles.cropText}>1:1</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCrop(16/9)} style={styles.cropItem}>
                  <Text style={styles.cropText}>16:9</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCrop(4/3)} style={styles.cropItem}>
                  <Text style={styles.cropText}>4:3</Text>
                </TouchableOpacity>
              </View>
            )}

            {}
            {editorMode === 'draw' && (
              <View style={styles.colorPalette}>
                {['#25D366', '#FF3B30', '#007AFF', '#FFD700', '#FFF'].map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorBubble, { backgroundColor: color }, brushColor === color && styles.colorBubbleActive]}
                    onPress={() => setBrushColor(color)}
                  />
                ))}
                <TouchableOpacity style={styles.undoBtn} onPress={() => setPaths(p => p.slice(0, -1))}>
                  <Ionicons name="arrow-undo" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}

            {}
            <View style={styles.mediaContainer}>
              {capturedMedia[activeIdx]?.type === 'video' ? (
                <VideoPreview uri={capturedMedia[activeIdx].uri} />
              ) : (
                <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={StyleSheet.absoluteFill}>
                  <Image source={{ uri: capturedMedia[activeIdx]?.uri }} style={styles.mediaPreview} resizeMode="contain" />

                  {}
                  <Svg style={StyleSheet.absoluteFill}>
                    {paths.map((p, idx) => (
                      <Path
                        key={idx}
                        d={p.points.join(' ')}
                        fill="none"
                        stroke={p.color}
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </Svg>

                  {}
                  {texts.map((t) => (
                    <TextItem
                      key={t.id}
                      item={t}
                      onUpdatePosition={(x, y) => {
                        setTexts(prev => prev.map(item => item.id === t.id ? { ...item, x, y } : item));
                      }}
                      onPress={() => {
                        setEditingTextId(t.id);
                        setTextInputValue(t.text);
                        setShowTextInput(true);
                      }}
                    />
                  ))}

                  {}
                  {editorMode === 'draw' && (
                    <View
                      style={StyleSheet.absoluteFill}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    />
                  )}
                </ViewShot>
              )}
            </View>

            {}
            <View style={styles.editorFooter}>
              {}
              <View style={styles.commentRow}>
                {}
                <TouchableOpacity style={styles.addMoreBtn} onPress={() => setCurrentStep('camera')}>
                  <Ionicons name="image-outline" size={26} color="#FFF" />
                  <Ionicons name="add-circle" size={16} color="#25D366" style={styles.addIconMini} />
                </TouchableOpacity>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Añade un comentario..."
                    placeholderTextColor="#999"
                    value={capturedMedia[activeIdx]?.caption || ''}
                    onChangeText={(val) => {
                      setCapturedMedia(prev => prev.map((item, idx) => idx === activeIdx ? { ...item, caption: val } : item));
                    }}
                  />
                </View>

                {}
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendAll}>
                  <Ionicons name="send" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>

              {}
              <View style={styles.carouselRow}>
                <FlatList
                  horizontal
                  data={capturedMedia}
                  keyExtractor={(item, index) => index.toString()}
                  contentContainerStyle={styles.carouselList}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      style={[styles.thumbContainer, index === activeIdx && styles.thumbContainerActive]}
                      onPress={() => {
                        setActiveIdx(index);
                        resetEditorState();
                      }}
                    >
                      <Image source={{ uri: item.uri }} style={styles.carouselThumb} />
                      {item.type === 'video' && (
                        <Ionicons name="videocam" size={14} color="#FFF" style={styles.videoIconBadge} />
                      )}
                      <TouchableOpacity
                        style={styles.deleteThumbBtn}
                        onPress={() => {
                          const updated = capturedMedia.filter((_, i) => i !== index);
                          if (updated.length === 0) {
                            setCapturedMedia([]);
                            setCurrentStep('camera');
                          } else {
                            setCapturedMedia(updated);
                            setActiveIdx(0);
                            resetEditorState();
                          }
                        }}
                      >
                        <Ionicons name="close-circle" size={16} color="#FF3B30" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}
                />

              </View>
            </View>

            {}
            <Modal visible={showTextInput} transparent animationType="fade">
              <View style={styles.textModalContainer}>
                <TextInput
                  style={[styles.textModalInput, { color: brushColor }]}
                  value={textInputValue}
                  onChangeText={setTextInputValue}
                  autoFocus
                  multiline
                  placeholder="Escribe texto..."
                  placeholderTextColor="#666"
                />
                <TouchableOpacity style={styles.textModalSave} onPress={handleSaveText}>
                  <Ionicons name="checkmark-circle" size={44} color="#25D366" />
                </TouchableOpacity>
              </View>
            </Modal>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 },
  permissionText: { color: '#FFF', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  permissionBtn: { backgroundColor: '#25D366', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25 },
  permissionBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  closeBtn: { position: 'absolute', top: 40, left: 20 },

  
  cameraContainer: { flex: 1 },
  topControls: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  flipBtn: { width: 45, alignItems: 'center' },
  galleryPlaceholder: { width: 45, height: 45 },
  captureRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  captureCenter: { width: 68, height: 68, borderRadius: 34 },
  galleryPreview: { width: 45, height: 45, borderRadius: 8, borderWidth: 1.5, borderColor: '#FFF', overflow: 'hidden', position: 'relative' },
  galleryThumb: { width: '100%', height: '100%' },
  galleryBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#25D366', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  galleryBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  tabItem: { paddingVertical: 6, paddingHorizontal: 12 },
  tabText: { color: '#AAA', fontSize: 15, fontFamily: 'Nunito-Bold' },
  tabTextActive: { color: '#FFF', borderBottomWidth: 2, borderBottomColor: '#25D366', paddingBottom: 2 },

  
  editorContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'space-between' },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 50 },
  editorTools: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  textToolIcon: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  mediaContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  mediaPreview: { width: screenWidth, height: '100%' },
  
  
  cropMenu: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(0,0,0,0.8)', paddingVertical: 10 },
  cropItem: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, backgroundColor: '#222' },
  cropText: { color: '#FFF', fontSize: 14 },
  colorPalette: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.8)' },
  colorBubble: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#FFF' },
  colorBubbleActive: { borderWidth: 3, borderColor: '#25D366' },
  undoBtn: { marginLeft: 15 },

  
  textItem: { position: 'absolute', padding: 8, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
  textItemText: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  textModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  textModalInput: { fontSize: 32, fontWeight: 'bold', width: '100%', textAlign: 'center', marginBottom: 30 },
  textModalSave: { alignSelf: 'center' },

  
  editorFooter: { paddingVertical: 12, paddingHorizontal: 14, backgroundColor: 'rgba(0,0,0,0.95)', borderTopWidth: 0.5, borderTopColor: '#333' },
  commentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addMoreBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  addIconMini: { position: 'absolute', bottom: 4, right: 4 },
  inputWrapper: { flex: 1, backgroundColor: '#1C1C1C', borderRadius: 25, height: 44, paddingHorizontal: 15, justifyContent: 'center' },
  commentInput: { color: '#FFF', fontSize: 16 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#25D366', justifyContent: 'center', alignItems: 'center' },
  
  
  carouselRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'space-between' },
  carouselList: { gap: 8 },
  thumbContainer: { width: 48, height: 48, borderRadius: 6, borderWidth: 1, borderColor: '#555', overflow: 'hidden', position: 'relative' },
  thumbContainerActive: { borderColor: '#25D366', borderWidth: 2 },
  carouselThumb: { width: '100%', height: '100%' },
  videoIconBadge: { position: 'absolute', bottom: 2, left: 2 },
  deleteThumbBtn: { position: 'absolute', top: -4, right: -4, zIndex: 5 },
});