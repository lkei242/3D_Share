// src/screens/profile_screens/ContactsScreen.js
import React from 'react';
import { Dimensions, ScrollView, View, Text, TouchableOpacity, StyleSheet, TextInput, FlatList } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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

export default function ContactsScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Usuario</Text>
      </View>

      {/* Estadísticas */}
      <View style={styles.stats}>
        <Text style={[styles.statText, { color: colors.text }]}>0 seguidores</Text>
        <Text style={[styles.statText, { color: colors.text }]}>6 seguidos</Text>
      </View>

      {/* Swipe lists */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {/* Seguidores */}
        <View style={{ width: width - 40 }}>
          <TextInput
            placeholder="Buscar"
            placeholderTextColor="#999"
            style={[
              styles.search, 
              { 
                backgroundColor: isDark ? '#1f1f1f' : '#EEEEEE',
                color: colors.text 
              }
            ]}
          />
          <FlatList
            data={followers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.userRow, { backgroundColor: isDark ? '#1f1f1f' : '#F5F5F5' }]}>
                <Ionicons name="person-circle" size={40} color={colors.text} />
                <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Seguidos */}
        <View style={{ width: width - 40 }}>
          <TextInput
            placeholder="Buscar"
            placeholderTextColor="#999"
            style={[
              styles.search, 
              { 
                backgroundColor: isDark ? '#1f1f1f' : '#EEEEEE',
                color: colors.text 
              }
            ]}
          />
          <FlatList
            data={following}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.userRow, { backgroundColor: isDark ? '#1f1f1f' : '#F5F5F5' }]}>
                <Ionicons name="person-circle" size={40} color={colors.text} />
                <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
              </TouchableOpacity>
            )}
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
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
  },
  statText: {
    fontSize: 16,
  },
  search: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
  },
  userName: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
  },
});