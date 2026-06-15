import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PreferencesScreen({ navigation }) {
  const [africanMode, setAfricanMode] = useState(false);
  const [videoPreview, setVideoPreview] = useState(true);
  const [highQualityImages, setHighQualityImages] = useState(true);
  const [highQualityVideos, setHighQualityVideos] = useState(true);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <Text style={styles.title}>
          Preferencias
        </Text>
      </View>

      <View style={styles.content}>
        {/* Idioma */}
        <View style={styles.languageRow}>
          <Text style={styles.label}>
            Idioma
          </Text>

          <TouchableOpacity style={styles.languageButton}>
            <Text style={styles.languageText}>
              ESPAÑOL
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>
            Modo Oscuro
          </Text>

          <Switch
            value={africanMode}
            onValueChange={setAfricanMode}
          />
        </View>

        {/* Vista previa */}
        <View style={styles.row}>
          <Text style={styles.label}>
            Vista previa de videos
          </Text>

          <Switch
            value={videoPreview}
            onValueChange={setVideoPreview}
          />
        </View>

        {/* Imágenes HQ */}
        <View style={styles.row}>
          <Text style={styles.label}>
            Imágenes de Alta Calidad
          </Text>

          <Switch
            value={highQualityImages}
            onValueChange={setHighQualityImages}
          />
        </View>

        {/* Videos HQ */}
        <View style={styles.row}>
          <Text style={styles.label}>
            Videos de alta calidad
          </Text>

          <Switch
            value={highQualityVideos}
            onValueChange={setHighQualityVideos}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 50,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
  },

  content: {
    paddingHorizontal: 20,
  },

  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },

  languageButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#555',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },

  languageText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },

  label: {
    color: '#FFFFFF',
    fontSize: 17,
    flex: 1,
    marginRight: 15,
  },
});