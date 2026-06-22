import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

const GREEN_ACCENT = '#546F1C';

export default function ChatDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colors.text === '#FFFFFF';
  
  const chatName = route.params?.name || 'Flexi JIMGA';
  
  // Lista de mensajes precargados (en estado para poder enviar, editar o borrar)
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hola! Cómo estás?', sender: 'other', time: '17:40', read: true, isFavorite: false },
    { id: '2', text: 'Hola! Todo bien por acá. ¿Y vos?', sender: 'me', time: '17:41', read: true, isFavorite: false },
    { id: '3', text: 'Pasame precio del nuevo catálogo por favor', sender: 'other', time: '17:42', read: true, isFavorite: false },
  ]);

  const [inputText, setInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  
  // Estados para controlar visibilidad de los menús
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showMoreSubMenu, setShowMoreSubMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [showMsgInfo, setShowMsgInfo] = useState(false);

  const flatListRef = useRef(null);
  const activeMsg = messages.find(m => m.id === selectedMessageId);

  // Cierra todos los menús flotantes abiertos
  const closeAllMenus = () => {
    setShowHeaderMenu(false);
    setShowMoreSubMenu(false);
    setShowAttachmentMenu(false);
  };

  // Enviar / Guardar edición de un mensaje
  const handleSend = () => {
    if (inputText.trim() === '') return;

    if (editingMessageId) {
      setMessages(prev => prev.map(msg => 
        msg.id === editingMessageId ? { ...msg, text: inputText } : msg
      ));
      setEditingMessageId(null);
    } else {
      const newMsg = {
        id: Date.now().toString(),
        text: inputText,
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        isFavorite: false
      };
      setMessages(prev => [...prev, newMsg]);
      
      // Auto-scrollear abajo
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    
    setInputText('');
  };

  // Acciones de mensajes
  const handleReply = () => {
    if (!activeMsg) return;
    Alert.alert('Responder', `Respondiendo a: "${activeMsg.text}"`);
    setSelectedMessageId(null);
  };

  const handleFavorite = () => {
    if (!selectedMessageId) return;
    setMessages(prev => prev.map(msg => 
      msg.id === selectedMessageId ? { ...msg, isFavorite: !msg.isFavorite } : msg
    ));
    setSelectedMessageId(null);
  };

  const handleDelete = () => {
    if (!selectedMessageId) return;
    Alert.alert(
      'Eliminar Mensaje',
      '¿Deseas eliminar este mensaje?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => {
            setMessages(prev => prev.filter(msg => msg.id !== selectedMessageId));
            setSelectedMessageId(null);
          }
        }
      ]
    );
  };

  const handleForward = () => {
    if (!activeMsg) return;
    Alert.alert('Reenviar', `Reenviando mensaje: "${activeMsg.text}"`);
    setSelectedMessageId(null);
  };

  const handleCopy = () => {
    if (!activeMsg) return;
    Alert.alert('Copiado', 'El mensaje se ha copiado al portapapeles');
    setSelectedMessageId(null);
  };

  const handleStartEdit = () => {
    if (!activeMsg || activeMsg.sender !== 'me') return;
    setInputText(activeMsg.text);
    setEditingMessageId(activeMsg.id);
    setSelectedMessageId(null);
  };

  // Renderizador de cada Burbuja
  const renderMessageItem = ({ item }) => {
    const isMe = item.sender === 'me';
    
    return (
      <TouchableOpacity
        onLongPress={() => {
          setSelectedMessageId(item.id);
          setShowMsgInfo(false);
        }}
        delayLongPress={450}
        activeOpacity={0.9}
        style={[
          styles.messageRow,
          isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}
      >
        {!isMe && (
          <View style={styles.bubbleAvatarCircle}>
            <Text style={styles.bubbleAvatarText}>{chatName.charAt(0)}</Text>
          </View>
        )}

        <View style={[
          styles.messageBubble,
          isMe 
            ? { backgroundColor: GREEN_ACCENT, borderBottomRightRadius: 2 } 
            : { backgroundColor: isDark ? '#1C1C1C' : '#EFEFEF', borderBottomLeftRadius: 2 }
        ]}>
          <Text style={[
            styles.messageText, 
            { color: isMe ? '#FFF' : colors.text }
          ]}>
            {item.text}
          </Text>
          
          <View style={styles.timeRow}>
            {item.isFavorite && (
              <Ionicons name="star" size={11} color={isMe ? '#FFEE00' : '#FFD700'} style={{ marginRight: 4 }} />
            )}
            <Text style={[
              styles.messageTime, 
              { color: isMe ? '#E1E1E1' : '#888' }
            ]}>
              {item.time}
            </Text>
            {isMe && (
              <Ionicons 
                name={item.read ? "checkmark-done" : "checkmark"} 
                size={14} 
                color={item.read ? '#FFEE00' : '#E1E1E1'} 
                style={{ marginLeft: 4 }} 
              />
            )}
          </View>
        </View>

        {isMe && (
          <View style={[styles.bubbleAvatarCircle, { backgroundColor: '#444', borderColor: '#CCC' }]}>
            <Text style={[styles.bubbleAvatarText, { color: '#FFF' }]}>M</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={closeAllMenus}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* HEADER DUAL (Barra de Herramientas o Nombre) */}
        {selectedMessageId ? (
          /* Header en Modo Pulsación Larga (Herramientas superiores) */
          <View style={[
            styles.toolHeader, 
            { backgroundColor: isDark ? '#1C1C1C' : '#E0EAE0', paddingTop: insets.top + 8 }
          ]}>
            <TouchableOpacity onPress={() => setSelectedMessageId(null)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
            
            <View style={styles.toolIconsContainer}>
              <TouchableOpacity style={styles.toolIcon} onPress={handleReply}>
                <Ionicons name="arrow-undo" size={22} color={colors.text} />
                <Text style={[styles.toolText, { color: colors.text }]}>responder</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.toolIcon} onPress={handleFavorite}>
                <Ionicons name={activeMsg?.isFavorite ? "star" : "star-outline"} size={22} color={colors.text} />
                <Text style={[styles.toolText, { color: colors.text }]}>favoritos</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.toolIcon} onPress={() => setShowMsgInfo(!showMsgInfo)}>
                <Ionicons name="information-circle" size={22} color={colors.text} />
                <Text style={[styles.toolText, { color: colors.text }]}>info</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.toolIcon} onPress={handleDelete}>
                <Ionicons name="trash" size={22} color="#a70d0d" />
                <Text style={[styles.toolText, { color: '#a70d0d' }]}>eliminar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.toolIcon} onPress={handleForward}>
                <Ionicons name="arrow-redo" size={22} color={colors.text} />
                <Text style={[styles.toolText, { color: colors.text }]}>reenviar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.toolIcon} 
                onPress={() => {
                  Alert.alert(
                    'Más opciones',
                    'Selecciona una opción:',
                    [
                      { text: 'Copiar', onPress: handleCopy },
                      ...(activeMsg?.sender === 'me' ? [{ text: 'Editar', onPress: handleStartEdit }] : []),
                      { text: 'Cancelar', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
                <Text style={[styles.toolText, { color: colors.text }]}>más</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Header Normal de Chat */
          <View style={[
            styles.header, 
            { backgroundColor: isDark ? '#0B0B0B' : '#F5F5F5', paddingTop: insets.top + 8 }
          ]}>
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
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => Alert.alert('Info de Usuario', `Ver perfil de ${chatName}`)}>
                <Ionicons name="information-circle-outline" size={26} color={colors.text} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => { setShowHeaderMenu(!showHeaderMenu); setShowMoreSubMenu(false); }}>
                <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* DETALLE DE INFO DEL MENSAJE (Leído por / Entregado a) */}
        {showMsgInfo && activeMsg && (
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

        {/* LISTA DE Burbujas de mensajes */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* BARRA DE ENTRADA E INPUT */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Menú desplegable de Clip (Adjuntos) */}
          {showAttachmentMenu && (
            <View style={[styles.attachmentTray, { backgroundColor: isDark ? '#1C1C1C' : '#FFF', borderColor: colors.border }]}>
              <TouchableOpacity style={styles.attachmentItem} onPress={() => { setShowAttachmentMenu(false); Alert.alert('Cámara', 'Abrir cámara'); }}>
                <Ionicons name="camera" size={20} color={GREEN_ACCENT} />
                <Text style={[styles.attachmentText, { color: colors.text }]}>Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentItem} onPress={() => { setShowAttachmentMenu(false); Alert.alert('Galería', 'Abrir galería'); }}>
                <Ionicons name="images" size={20} color={GREEN_ACCENT} />
                <Text style={[styles.attachmentText, { color: colors.text }]}>Galería</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentItem} onPress={() => { setShowAttachmentMenu(false); Alert.alert('Archivos', 'Abrir archivos'); }}>
                <Ionicons name="document-text" size={20} color={GREEN_ACCENT} />
                <Text style={[styles.attachmentText, { color: colors.text }]}>Archivos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentItem} onPress={() => { setShowAttachmentMenu(false); Alert.alert('Ubicación', 'Enviar ubicación'); }}>
                <Ionicons name="location" size={20} color={GREEN_ACCENT} />
                <Text style={[styles.attachmentText, { color: colors.text }]}>Ubicación</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentItem} onPress={() => { setShowAttachmentMenu(false); Alert.alert('Perfil', `Ver perfil de ${chatName}`); }}>
                <Ionicons name="person" size={20} color={GREEN_ACCENT} />
                <Text style={[styles.attachmentText, { color: colors.text }]}>Ver perfil</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Caja del Input inferior */}
          <View style={styles.inputContainer}>
            <View style={[styles.textInputWrapper, { backgroundColor: isDark ? '#1C1C1C' : '#F2F2F2' }]}>
              <TouchableOpacity onPress={() => Alert.alert('Cámara', 'Cámara rápida')}>
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

            <TouchableOpacity 
              onPress={handleSend}
              style={[styles.actionButton, { backgroundColor: GREEN_ACCENT }]}
            >
              <Ionicons 
                name={inputText.trim().length > 0 ? "send" : "mic-outline"} 
                size={22} 
                color="#FFF" 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Cabecera Normal
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    maxWidth: 150,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'Nunito-Regular',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    padding: 6,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00A3FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFEE00',
  },
  avatarText: {
    color: '#FFEE00',
    fontSize: 20,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  // Barra de herramientas (Long Press)
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  toolIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: 1,
    marginLeft: 10,
  },
  toolIcon: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  toolText: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'Nunito-Regular',
  },
  // Lista de burbujas
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  bubbleAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00A3FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFEE00',
    marginHorizontal: 8,
  },
  bubbleAvatarText: {
    color: '#FFEE00',
    fontSize: 15,
    fontWeight: 'bold',
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
    lineHeight: 20,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTime: {
    fontSize: 10,
    fontFamily: 'Nunito-Regular',
  },
  // Info Overlay
  infoOverlay: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    marginBottom: 12,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  infoLabel: {
    fontWeight: 'bold',
    marginLeft: 6,
  },
  infoCloseBtn: {
    marginTop: 14,
    alignSelf: 'flex-end',
  },
  infoCloseText: {
    color: GREEN_ACCENT,
    fontWeight: 'bold',
  },
  // Menú de 3 puntos (Header)
  dropdownMenu: {
    position: 'absolute',
    top: 90,
    right: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 99,
    minWidth: 200,
    paddingVertical: 6,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
  },
  subDropdownMenu: {
    borderRadius: 8,
    borderWidth: 0.5,
    marginTop: 4,
    marginHorizontal: 8,
    paddingVertical: 4,
  },
  // Input inferior
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  textInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 8,
    minHeight: 48,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Menú de Clip (Adjuntos) flotante
  attachmentTray: {
    position: 'absolute',
    bottom: 64,
    right: 20,
    left: 20,
    borderRadius: 15,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 98,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attachmentItem: {
    alignItems: 'center',
    width: 60,
  },
  attachmentText: {
    fontSize: 9,
    marginTop: 4,
    fontFamily: 'Nunito-Regular',
    textAlign: 'center',
  },
});