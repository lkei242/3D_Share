// src/screens/profile_screens/ContactsScreen.js
import React, { useState, useRef } from 'react';
import { 
  Dimensions, 
  ScrollView, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  FlatList 
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const PAGE_WIDTH = width - 40;

// Datos de ejemplo
const followers = [
  { id: '1', name: 'usuario 1' },
  { id: '2', name: 'usuario 2' },
  { id: '3', name: 'usuario 3' },
];

const following = [
  { id: '4', name: 'usuario 4' },
  { id: '5', name: 'usuario 5' },
  { id: '6', name: 'usuario 6' },
];

// Función para generar colores de avatar basados en el nombre
const getAvatarColor = (name) => {
  const colors = ['#FFB6C1', '#ADD8E6', '#90EE90', '#FFDAB9', '#D8BFD8', '#F0E68C', '#FFA07A'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function ContactsScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.dark || colors.text === '#FFFFFF';
  
  const [activeTab, setActiveTab] = useState(0);
  const scrollViewRef = useRef(null);

  const handleTabPress = (index) => {
    setActiveTab(index);
    scrollViewRef.current?.scrollTo({ x: index * PAGE_WIDTH, animated: true });
  };

  const handleScrollEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
    setActiveTab(index);
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.userRow, 
        { 
          backgroundColor: isDark ? '#1f1f1f' : '#FFFFFF',
          borderColor: isDark ? '#333333' : '#F0F0F0'
        }
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.userHandle, { color: isDark ? '#888' : '#666' }]}>@{item.name.replace(' ', '_')}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={isDark ? '#666' : '#CCC'} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Contactos</Text>
      </View>

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>0</Text>
          <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>Seguidores</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>6</Text>
          <Text style={[styles.statLabel, { color: isDark ? '#AAA' : '#666' }]}>Seguidos</Text>
        </View>
      </View>

      {/* Indicador de Pestañas (Tabs) */}
      <View style={[styles.tabContainer, { backgroundColor: isDark ? '#1f1f1f' : '#F5F5F5' }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 0 && [styles.activeTab, { backgroundColor: isDark ? '#333' : '#FFFFFF' }]]}
          onPress={() => handleTabPress(0)}
        >
          <Text style={[styles.tabText, { color: activeTab === 0 ? colors.text : isDark ? '#888' : '#888' }]}>
            Seguidores
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 1 && [styles.activeTab, { backgroundColor: isDark ? '#333' : '#FFFFFF' }]]}
          onPress={() => handleTabPress(1)}
        >
          <Text style={[styles.tabText, { color: activeTab === 1 ? colors.text : isDark ? '#888' : '#888' }]}>
            Seguidos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Swipe lists */}
      <ScrollView 
        ref={scrollViewRef}
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.scrollView}
      >
        {/* Página 1: Seguidores */}
        <View style={{ width: PAGE_WIDTH }}>
          <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1f1f1f' : '#F5F5F5' }]}>
            <Ionicons name="search" size={20} color={isDark ? '#888' : '#999'} style={styles.searchIcon} />
            <TextInput
              placeholder="Buscar seguidores..."
              placeholderTextColor={isDark ? '#666' : '#999'}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
          <FlatList
            data={followers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>

        {/* Página 2: Seguidos */}
        <View style={{ width: PAGE_WIDTH }}>
          <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1f1f1f' : '#F5F5F5' }]}>
            <Ionicons name="search" size={20} color={isDark ? '#888' : '#999'} style={styles.searchIcon} />
            <TextInput
              placeholder="Buscar seguidos..."
              placeholderTextColor={isDark ? '#666' : '#999'}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
          <FlatList
            data={following}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    // Sombras para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    // Sombra para Android
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userHandle: {
    fontSize: 13,
    marginTop: 2,
  },
});