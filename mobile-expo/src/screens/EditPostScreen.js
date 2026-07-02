import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config/firebase';

export default function EditPostScreen({ route, navigation }) {
  const { post } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [titulo, setTitulo] = useState(post.title || '');
  const [descripcion, setDescripcion] = useState(post.description || '');
  const [precio, setPrecio] = useState(
    post.price ? post.price.replace('$', '') : ''
  );
  const [webLink, setWebLink] = useState(post.webLink || '');
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    if (!titulo.trim()) {
      showToast('Por favor ingresa un título.');
      return;
    }
    const linkError = validateWebLink(webLink);
    if (linkError) {
      showToast(linkError);
      return;
    }
    setSaving(true);
    try {
      const precioTrim = precio.trim();
      await updateDoc(doc(db, 'posts', post.id), {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        precio: precioTrim ? parseFloat(precioTrim) : null,
        webLink: webLink.trim() || null,
      });

      // Avisar a la pantalla anterior para que se actualice de inmediato, sin esperar un refetch
      route.params?.onSave?.(post.id, {
        title: titulo.trim(),
        description: descripcion.trim(),
        price: precioTrim ? `${precioTrim}$` : null,
        webLink: webLink.trim() || null,
      });

      showToast('Cambios guardados con éxito.', 'success');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      console.log('Error al editar publicación:', error);
      showToast('Error al conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#0B0B0B' : '#F5F5F5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Editar Publicación</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#9DBD3F" />
          ) : (
            <Text style={styles.saveText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>Título *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ej: Soporte articulado para tableta"
          placeholderTextColor="#707070"
        />

        <Text style={[styles.label, { color: colors.text }]}>Descripción(Opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Describe los detalles de tu pieza 3D, material, tiempo, etc..."
          placeholderTextColor="#707070"
          multiline
          numberOfLines={4}
        />

        <Text style={[styles.label, { color: colors.text }]}>Precio (Opcional, en $)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}
          value={precio}
          onChangeText={setPrecio}
          placeholder="Ej: 5000 (Dejar vacío si no está a la venta)"
          placeholderTextColor="#707070"
          keyboardType="numeric"
        />

        <Text style={[styles.label, { color: colors.text }]}>Enlace web al modelo (Opcional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}
          value={webLink}
          onChangeText={setWebLink}
          placeholder="Ej: https://misitio.com/pieza-3d"
          placeholderTextColor="#707070"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {toastMessage !== '' && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: toastType === 'success' ? '#27AE60' : '#E74C3C',
              opacity: toastAnim,
              transform: [{
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              }],
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
  },
  saveText: {
    color: '#9DBD3F',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
    borderWidth: 1,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  toast: {
    position: 'absolute',
    top: 60,
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