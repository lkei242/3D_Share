import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../../config/firebase';
import { API_URL } from '../../config/api';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

export default function AdvancedInfoScreen({ navigation }) {
  const [presentation, setPresentation] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setPresentation(data.presentation || '');
            setProfilePicture(data.profilePicture || '');
          }
        } catch (error) {
          console.log('Error fetching advanced info:', error);
        } finally {
          setLoadingProfile(false);
        }
      };
      fetchData();
    }, [])
  );

  const pickAndUploadImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Se requieren permisos de galería para seleccionar una imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(asset.mimeType)) {
      alert('Solo se permiten imágenes JPG, PNG o WebP.');
      return;
    }

    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    if (fileInfo.exists && fileInfo.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar los 10MB.');
      return;
    }

    setUploading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      const formData = new FormData();
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () { resolve(xhr.response); };
        xhr.onerror = function () { reject(new TypeError('Error al leer el archivo.')); };
        xhr.responseType = 'blob';
        xhr.open('GET', asset.uri, true);
        xhr.send(null);
      });
      const filename = asset.uri.split('/').pop();
      formData.append('imagen', blob, filename);

      const res = await fetch(`${API_URL}/api/media/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await res.json();

      if (res.ok) {
        await updateDoc(doc(db, 'users', user.uid), {
          profilePicture: uploadData.url,
        });
        setProfilePicture(uploadData.url);
      } else {
        alert('Error al subir la imagen.');
      }
    } catch (error) {
      console.log('Error subiendo imagen:', error);
      alert('Error al subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const removeProfilePicture = async () => {
    setShowOptions(false);
    setUploading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      await updateDoc(doc(db, 'users', user.uid), {
        profilePicture: '',
      });
      setProfilePicture('');
    } catch (error) {
      console.log('Error eliminando foto:', error);
      alert('No se pudo eliminar la foto.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background }
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? '#121212' : '#FFFFFF',
            borderBottomColor: isDark ? '#222' : '#E5E5E5',
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={26}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            { color: colors.text }
          ]}
        >
          Información Avanzada
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.avatarContainer} onPress={() => setShowOptions(true)} disabled={uploading}>
          {loadingProfile ? (
            <View style={[styles.avatar, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
              <ActivityIndicator size="small" color="#546F1C" />
            </View>
          ) : profilePicture ? (
            <View>
              <Image
                source={{ uri: profilePicture }}
                style={[styles.avatar, { borderColor: isDark ? '#333' : '#DCDCDC' }]}
              />
              {uploading && (
                <View style={[styles.avatar, { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                  <ActivityIndicator size="small" color="#FFF" />
                </View>
              )}
            </View>
          ) : uploading ? (
            <View style={[styles.avatar, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
              <ActivityIndicator size="small" color="#546F1C" />
            </View>
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                  borderColor: isDark ? '#333' : '#DCDCDC',
                },
              ]}
            >
              <Ionicons name="person-circle-outline" size={84} color="#94BA46" />
            </View>
          )}

          <Text
            style={[
              styles.avatarText,
              { color: colors.text }
            ]}
          >
            {loadingProfile ? '' : uploading ? 'Subiendo...' : 'Cambiar foto de perfil'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonSpacing}
          onPress={() =>
            navigation.navigate('PresentationScreen', { currentPresentation: presentation })
          }
        >
          <View
            style={[
              styles.selectBox,
              {
                backgroundColor: isDark
                  ? '#1E1E1E'
                  : '#F5F5F5',
                borderColor: isDark
                  ? '#333'
                  : '#DCDCDC',
              },
            ]}
          >
            <Text
              style={{
                color: isDark ? '#777' : '#555',
              }}
            >
              Editar presentación
            </Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? '#AAA' : '#666'}
            />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showOptions} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#2A2A2A' : '#FFF' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Foto de perfil</Text>
            <View style={[styles.modalDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => { setShowOptions(false); pickAndUploadImage(); }}
            >
              <Ionicons name="camera" size={22} color="#546F1C" />
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Cambiar foto</Text>
            </TouchableOpacity>
            <View style={[styles.modalDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
            <TouchableOpacity style={styles.modalOption} onPress={removeProfilePicture}>
              <Ionicons name="trash" size={22} color="#E74C3C" />
              <Text style={[styles.modalOptionText, { color: '#E74C3C' }]}>Eliminar foto</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },

  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 15,
  },

  content: {
    padding: 20,
  },

  avatarContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  avatarFallback: {
    backgroundColor: 'transparent',
  },

  avatarText: {
    color: '#FFF',
    fontSize: 16,
  },

  selectBox: {
    height: 50,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  buttonSpacing: {
    marginBottom: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '75%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalDivider: {
    height: 1,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});