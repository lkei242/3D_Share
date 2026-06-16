// src/screens/ChatScreen.js
import React from 'react';
import { useTheme } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

const GREEN_ACCENT = '#546F1C';

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
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const renderChatItem = ({ item }) => (
    <TouchableOpacity style={styles.chatRow} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>J</Text>
        </View>
      </View>

      <View style={styles.chatDetails}>
        <View style={styles.chatHeaderRow}>
          <Text style={[styles.chatName, { color: colors.text }]}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <Text style={[styles.chatMessage, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={1}>
          {item.message}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: isDark ? '#0B0B0B' : '#F5F5F5', 
          paddingTop: insets.top + 8 
        }
      ]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.titleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
            <Ionicons name="caret-down" size={14} color={GREEN_ACCENT} style={styles.caretIcon} />
          </View>
        </View>
        <TouchableOpacity style={styles.solicitudesButton}>
          <Text style={[styles.solicitudesText, { color: colors.text }]}>Solicitudes</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterTabActive}>
          <Text style={styles.filterTextActive}>Mensajes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTab}>
          <Text style={[styles.filterText, { color: colors.text }]}>Grupos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTab}>
          <Text style={[styles.filterText, { color: colors.text }]}>Difusión</Text>
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={[
        styles.searchContainer, 
        { backgroundColor: isDark ? '#1F2611' : '#F0F4E8' }
      ]}>
        <Feather name="search" size={20} color={GREEN_ACCENT} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar chats"
          placeholderTextColor={GREEN_ACCENT}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      {/* Lista de Chats */}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    color: '#9DBD3F',
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
  filterText: {
    fontSize: 18,
    fontFamily: 'Nunito-Regular',
    opacity: 0.6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  chatTime: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
  },
  chatMessage: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
  },
});