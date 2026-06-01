// src/screens/HomeScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ScrollView,
  SafeAreaView,
} from 'react-native';

const GREEN = '#9DBD3F';
const { width } = Dimensions.get('window');

// Ancho de cada tarjeta (2 columnas con gap)
const CARD_WIDTH = (width - 36) / 2;

// ─── Datos de ejemplo (después los reemplazás con datos reales de la API) ───
const POSTS = [
  {
    id: '1',
    title: 'Pirañas mult...',
    image: 'https://picsum.photos/seed/pirana1/400/300',
    price: null,
    views: '100 mil.',
    totalImages: 1,
  },
  {
    id: '2',
    title: 'Cangrejos imp...',
    image: 'https://picsum.photos/seed/crab1/400/300',
    price: '5000$',
    views: '100 mil.',
    totalImages: 3,
  },
  {
    id: '3',
    title: 'Pirañas mult...',
    image: 'https://picsum.photos/seed/pirana2/400/300',
    price: null,
    views: '100 mil.',
    totalImages: 1,
  },
  {
    id: '4',
    title: 'Cangrejos imp...',
    image: 'https://picsum.photos/seed/crab2/400/300',
    price: '10000$',
    views: '100 mil.',
    totalImages: 3,
  },
  {
    id: '5',
    title: 'Camión par...',
    image: 'https://picsum.photos/seed/truck1/400/300',
    price: '250000$',
    views: '100 mil.',
    totalImages: 1,
  },
  {
    id: '6',
    title: 'Cangrejos imp...',
    image: 'https://picsum.photos/seed/crab3/400/300',
    price: null,
    views: '100 mil.',
    totalImages: 3,
  },
  {
    id: '7',
    title: 'Tren de vapor...',
    image: 'https://picsum.photos/seed/train1/400/300',
    price: null,
    views: '100 mil.',
    totalImages: 1,
  },
  {
    id: '8',
    title: 'Cangrejos imp...',
    image: 'https://picsum.photos/seed/crab4/400/300',
    price: null,
    views: '100 mil.',
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

      {/* Precio sobre la imagen (si tiene precio) */}
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
          {/* Ícono de vistas (barras) */}
          <Text style={styles.statsIcon}>📊</Text>
          <Text style={styles.statsText}>{item.views}</Text>
          {/* Ícono de guardar */}
          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveIcon}>🔖</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Componente de ícono de la barra inferior ────────────────────────────────
function TabBarIcon({ icon, isActive, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tabItem, isActive && styles.tabItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
        {icon}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('home');

  const renderItem = ({ item }) => (
    <PostCard
      item={item}
      onPress={() => {
        // Cuando tengas la pantalla de detalle:
        // navigation.navigate('PostDetail', { postId: item.id });
      }}
    />
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Text style={styles.headerButtonText}>⊕ Publicar</Text>
        </TouchableOpacity>

        {/* Logo central */}
        <Image
          source={require('../../assets/logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />

        <TouchableOpacity style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Guardado</Text>
        </TouchableOpacity>
      </View>

      {/* ── Grid de publicaciones ───────────────────────────────────────────── */}
      <FlatList
        data={POSTS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Barra de navegación inferior ───────────────────────────────────── */}
      <View style={styles.tabBar}>
        <TabBarIcon
          icon="🏠"
          isActive={activeTab === 'home'}
          onPress={() => setActiveTab('home')}
        />
        <TabBarIcon
          icon="💬"
          isActive={activeTab === 'messages'}
          onPress={() => setActiveTab('messages')}
        />
        <TabBarIcon
          icon="🔍"
          isActive={activeTab === 'search'}
          onPress={() => setActiveTab('search')}
        />
        <TabBarIcon
          icon="👤"
          isActive={activeTab === 'profile'}
          onPress={() => setActiveTab('profile')}
        />
      </View>

    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // Contenedor principal
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#121212',
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  headerLogo: {
    width: 44,
    height: 44,
    tintColor: GREEN, // colorea el logo con el verde del proyecto
  },

  // ── Grid / Lista
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },

  // ── Tarjeta
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#111',
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 140,
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
    fontSize: 11,
    fontFamily: 'Nunito-Bold',
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 44, // justo encima del footer
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  priceText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  cardFooter: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#111',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    marginBottom: 4,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsIcon: {
    fontSize: 11,
  },
  statsText: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: 'Nunito-Bold',
    flex: 1,
  },
  saveButton: {
    padding: 2,
  },
  saveIcon: {
    fontSize: 13,
  },

  // ── Bottom Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderTopWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // Sombra sutil
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 50,
  },
  tabItemActive: {
    backgroundColor: GREEN,
  },
  tabIcon: {
    fontSize: 22,
  },
  tabIconActive: {
    // El emoji no cambia de color, pero el fondo verde ya indica cuál está activo
  },
});