// src/screens/HomeScreen.js

import React, { useState } from 'react';
import { MaterialCommunityIcons, Feather, Ionicons, Octicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';

const GREEN = '#9DBD3F';
const { width } = Dimensions.get('window');

// Ancho de cada tarjeta (2 columnas con su respectivo espaciado)
const CARD_WIDTH = (width - 36) / 2;

// ─── Datos de ejemplo ────────────────────────────────────────────────────────
const POSTS = [
  {
    id: '1',
    title: 'Pirañas mult...',
    image: 'https://picsum.photos/seed/pirana1/400/300',
    price: null,
    views: '100 mill.',
    totalImages: 1,
  },
  {
    id: '2',
    title: 'Cangrejos imp...',
    image: 'https://picsum.photos/seed/crab1/400/300',
    price: '5000$',
    views: '100 mill.',
    totalImages: 3,
  },
  {
    id: '3',
    title: 'Cancha de Boca',
    image: 'https://picsum.photos/seed/pirana2/400/300',
    price: null,
    views: '100 mill.',
    totalImages: 1,
  },
  {
    id: '4',
    title: 'Pato Lucas i...',
    image: 'https://picsum.photos/seed/crab2/400/300',
    price: '10000$',
    views: '100 mill.',
    totalImages: 3,
  },
  {
    id: '5',
    title: 'Camión par...',
    image: 'https://picsum.photos/seed/truck1/400/300',
    price: '250000$',
    views: '100 mill.',
    totalImages: 1,
  },
  {
    id: '6',
    title: 'Sonic Homelan...',
    image: 'https://picsum.photos/seed/crab3/400/300',
    price: null,
    views: '100 mill.',
    totalImages: 3,
  },
  {
    id: '7',
    title: 'Tren de vapor...',
    image: 'https://picsum.photos/seed/train1/400/300',
    price: null,
    views: '100 mill.',
    totalImages: 1,
  },
  {
    id: '8',
    title: 'Pikachu imp...',
    image: 'https://picsum.photos/seed/crab4/400/300',
    price: null,
    views: '100 mill.',
    totalImages: 3,
  },
];

// ─── Componente de cada tarjeta de publicación ───────────────────────────────
function PostCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Imagen principal */}
      <Image
        source={{ uri: item.image }}
        style={styles.cardImage}
        resizeMode="cover"
      />

      {/* Indicador de imágenes múltiples (ej: "1/3") */}
      {item.totalImages > 1 && (
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>1/{item.totalImages}</Text>
        </View>
      )}

      {/* Precio sobre la imagen (si tiene precio asignado) */}
      {item.price && (
        <View style={styles.priceOverlay}>
          <Text style={styles.priceText}>{item.price}</Text>
        </View>
      )}

      {/* Footer de la tarjeta */}
      <View style={styles.cardFooter}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.cardStats}>
          {/* Icono de barras vectoriales de estadísticas */}
          <MaterialCommunityIcons name="chart-bar" size={14} color="#aaa" />
          <Text style={styles.statsText}>{item.views}</Text>
          
          {/* Botón e Icono de guardar */}
          <TouchableOpacity style={styles.saveButton}>
            <MaterialCommunityIcons name="bookmark-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets(); // Obtiene insets nativos de Android 15 / Pixel 8

  const renderItem = ({ item }) => (
    <PostCard
      item={item}
      onPress={() => {
        // Enlace al detalle en el futuro:
        // navigation.navigate('PostDetail', { postId: item.id });
      }}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: '#121212' }]}>
      
      {/* Forzar que la barra de notificaciones sea completamente Edge-to-Edge */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        
        {/* Botón de publicar con Icono y texto alineados */}
        <TouchableOpacity style={styles.headerButton}>
          <View style={styles.publishButtonContainer}>
            <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#fff" />
            <Text style={styles.headerButtonText}>Publicar</Text>
          </View>
        </TouchableOpacity>

        {/* Logo central */}
        <Image
          source={require('../../assets/logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />

        {/* Botón de guardado */}
        <TouchableOpacity style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Guardado</Text>
        </TouchableOpacity>
      </View>

      {/* ── Grid de publicaciones ── */}
      <FlatList
        data={POSTS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

    </View>
  );
}

// Estilos 
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0B0B0B', // Color de header de Figma
  },
  headerButton: {
    paddingVertical: 6,
  },
  publishButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
  headerLogo: {
    width: 46,
    height: 46,
  },

  // ── Grid / Lista
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // ── Tarjetas
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#1C1C1C', // Gris oscuro minimalista
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 145,
  },
  imageCounter: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Nunito-Bold',
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priceText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  cardFooter: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#2C2C2C',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    marginBottom: 4,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'Nunito-Regular',
    flex: 1,
  },
  saveButton: {
    padding: 2,
  },

});