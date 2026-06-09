// src/screens/ChatScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

const GREEN_DARK = '#1F2611'; // Verde opaco para el buscador
const GREEN_ACCENT = '#546F1C'; // Verde principal

const MOCK_CHATS = [
  { id: '1', name: 'Flexi JIMGA', message: 'Pasame precio', time: '17:41' },
  { id: '2', name: 'Flexi JIMGA', message: 'Tú: Ok, luego lo ha...', time: 'Ayer' },
  { id: '3', name: 'Flexi JIMGA', message: 'Pasame precio', time: '13/5/26' },
  { id: '4', name: 'Flexi JIMGA', message: 'Pasame precio', time: '17:41' },
  { id: '5', name: 'Flexi JIMGA', message: 'Pasame precio', time: '17:41' },
  { id: '6', name: 'Flexi JIMGA', message: 'Pasame precio', time: '17:41' },
  { id: '7', name: 'Flexi JIMGA', message: 'Pasame precio', time: '17:41' },
  { id: '8', name: 'Flexi JIMGA', message: 'Pasame precio', time: '17:41' },
  { id: '9', name: 'Flexi JIMGA', message: 'Pasame precio', time: '17:41' },
];

export default function ChatScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const renderChatItem = ({ item }) => (
    <TouchableOpacity style={styles.chatRow} activeOpacity={0.7}>
      {/* Avatar personalizado que simula el diseño circular azul con J amarilla */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>J</Text>
        </View>
      </View>

      {/* Información del chat */}
      <View style={styles.chatDetails}>
        <View style={styles.chatHeaderRow}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <Text style={styles.chatMessage} numberOfLines={1}>
          {item.message}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Chats</Text>
            {/* Pequeño triángulo verde indicador bajo Chats */}
            <Ionicons name="caret-down" size={14} color={GREEN_ACCENT} style={styles.caretIcon} />
          </View>
        </View>
        <TouchableOpacity style={styles.solicitudesButton}>
          <Text style={styles.solicitudesText}>Solicitudes</Text>
        </TouchableOpacity>
      </View>

      {/* ── Filtros (Mensajes, Grupos, Difusión) ── */}
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterTabActive}>
          <Text style={styles.filterTextActive}>Mensajes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTab}>
          <Text style={styles.filterText}>Grupos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTab}>
          <Text style={styles.filterText}>Difusión</Text>
        </TouchableOpacity>
      </View>

      {/* ── Buscador ── */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color={GREEN_ACCENT} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar chats"
          placeholderTextColor={GREEN_ACCENT}
          style={styles.searchInput}
        />
      </View>

      {/* ── Lista de Chats ── */}
      <FlatList
        data={MOCK_CHATS}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

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
    paddingBottom: 12,
    backgroundColor: '#0B0B0B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 46,
    height: 46,
  },
  titleContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
  },
  caretIcon: {
    position: 'absolute',
    bottom: -14,
  },
  solicitudesButton: {
    paddingVertical: 6,
  },
  solicitudesText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 24,
  },
  filterTabActive: {
    paddingBottom: 4,
  },
  filterTab: {
    paddingBottom: 4,
  },
  filterTextActive: {
    color: '#9DBD3F', // Color de texto verde de la solapa activa
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
  filterText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Nunito-Regular',
    opacity: 0.8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN_DARK,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: 20,
  },
  chatRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#00A3FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFEE00',
  },
  avatarText: {
    color: '#FFEE00',
    fontSize: 28,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  chatDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  chatName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  chatTime: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
  },
  chatMessage: {
    color: '#aaa',
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
  },
});