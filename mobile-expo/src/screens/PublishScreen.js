import React, { useState } from 'react';
import { useTheme } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth } from './config/firebase';
import { API_URL } from './config/api';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config/firebase';

export default function PublishScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Se requieren permisos de galería para seleccionar una imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handlePublish = async () => {
    if (!titulo.trim()) {
      alert('Por favor ingresa un título.');
      return;
    }
    if (!image) {
      alert('Por favor selecciona una imagen.');
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Debes estar autenticado para publicar.');
        setLoading(false);
        return;
      }
      const token = await user.getIdToken();
      const formData = new FormData();
      // Preparar el blob de la imagen para la subida
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          console.log("XHR Error:", e);
          reject(new TypeError('Error al leer el archivo de la imagen.'));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', image, true);
        xhr.send(null);
      });
        
      const filename = image.split('/').pop();
      formData.append('imagen', blob, filename);
      // 1. Subir la imagen al backend (Cloudinary)
      const res = await fetch(`${API_URL}/api/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      const uploadData = await res.json();
      if (!res.ok) {
        alert(uploadData.error || 'Error al subir la imagen.');
        setLoading(false);
        return;
      }
      // 2. Guardar el Post directamente en Firestore
      await addDoc(collection(db, 'posts'), {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        precio: precio.trim() ? parseFloat(precio.trim()) : null,
        imagenes: [uploadData.url], // URL de Cloudinary
        autor: user.uid,
        vistas: 0,
        createdAt: serverTimestamp() // Timestamp del servidor
      });
      alert('¡Publicación creada con éxito!');
      navigation.goBack();
    } catch (error) {
      console.log('Error publicando post:', error);
      alert('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={{ paddingTop: insets.top }}>
        {/* Header adaptable */}
        <View style={[styles.header, { backgroundColor: isDark ? '#0B0B0B' : '#F5F5F5' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Crear Publicación</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity 
          style={[
            styles.imageSelector, 
            { 
              backgroundColor: colors.card,
              borderColor: isDark ? '#2D2D2D' : '#CCCCCC'
            }
          ]} 
          onPress={pickImage} 
          activeOpacity={0.8}
        >
          {image ? (
            <View style={{ width: '100%', height: '100%' }}>
              <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
              <View style={styles.changeImageOverlay}>
                <MaterialCommunityIcons name="camera" size={20} color="#fff" />
                <Text style={styles.changeImageText}>Cambiar foto</Text>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <MaterialCommunityIcons name="cloud-upload-outline" size={48} color="#9DBD3F" />
              <Text style={[styles.placeholderText, { color: isDark ? '#888' : '#666' }]}>
                Presiona para subir una imagen
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.text }]}>Título *</Text>
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card, 
              color: colors.text,
              borderColor: isDark ? '#2C2C2C' : '#E0E0E0'
            }
          ]}
          placeholder="Ej: Soporte articulado para tableta"
          placeholderTextColor="#707070"
          value={titulo}
          onChangeText={setTitulo}
        />

        <Text style={[styles.label, { color: colors.text }]}>Descripción</Text>
        <TextInput
          style={[
            styles.input, 
            styles.textArea,
            { 
              backgroundColor: colors.card, 
              color: colors.text,
              borderColor: isDark ? '#2C2C2C' : '#E0E0E0'
            }
          ]}
          placeholder="Describe los detalles de tu pieza 3D, material, tiempo, etc..."
          placeholderTextColor="#707070"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={4}
        />

        <Text style={[styles.label, { color: colors.text }]}>Precio (Opcional, en $)</Text>
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card, 
              color: colors.text,
              borderColor: isDark ? '#2C2C2C' : '#E0E0E0'
            }
          ]}
          placeholder="Ej: 5000 (Dejar vacío si no está a la venta)"
          placeholderTextColor="#707070"
          value={precio}
          onChangeText={setPrecio}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.publishButton, loading && styles.publishButtonDisabled]}
          onPress={handlePublish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.publishButtonText}>Publicar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    padding: 20,
  },
  imageSelector: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderContainer: {
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  changeImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
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
  publishButton: {
    backgroundColor: '#546F1C',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  publishButtonDisabled: {
    backgroundColor: '#354812',
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  
});