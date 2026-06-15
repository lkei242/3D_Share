// src/screens/PublishScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth } from './config/firebase';
import { API_URL } from './config/api';

export default function PublishScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Seleccionar imagen desde la galería del celular
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

  // Enviar los datos y la imagen al Backend
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

      // Obtener el JWT de Firebase actual
      const token = await user.getIdToken();

      // Construir FormData (necesario para multipart/form-data)
      const formData = new FormData();
      formData.append('titulo', titulo.trim());
      formData.append('descripcion', descripcion.trim());
      if (precio.trim()) {
        formData.append('precio', precio.trim());
      }

      // Ajustar la estructura de la imagen para React Native FormData
        const blob = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
            resolve(xhr.response); // Retorna el Blob nativo directo de Android/iOS
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
        const res = await fetch(`${API_URL}/api/posts`, {
            method: 'POST',
            headers: {
            'Authorization': `Bearer ${token}`,
            // NOTA: Quitamos 'Content-Type' para que fetch configure el boundary automáticamente
            },
            body: formData,
        });

      const data = await res.json();

      if (res.ok) {
        alert('¡Publicación creada con éxito!');
        navigation.goBack();
      } else {
        alert(data.error || 'Error al subir la publicación');
      }
    } catch (error) {
      console.log('Error publicando post:', error);
      alert('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

    return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0B" translucent />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Publicación</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.imageSelector} onPress={pickImage} activeOpacity={0.8}>
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
              <Text style={styles.placeholderText}>Presiona para subir una imagen</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Soporte articulado para tableta"
          placeholderTextColor="#707070"
          value={titulo}
          onChangeText={setTitulo}
        />

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe los detalles de tu pieza 3D, material, tiempo, etc..."
          placeholderTextColor="#707070"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Precio (Opcional, en $)</Text>
        <TextInput
          style={styles.input}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0B0B0B',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
  },
  scrollContent: {
    padding: 20,
  },
  imageSelector: {
    width: '100%',
    height: 200,
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2D2D2D',
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
    color: '#888',
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
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1C1C1C',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
    borderWidth: 1,
    borderColor: '#2C2C2C',
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
    shadowColor: '#546F1C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
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