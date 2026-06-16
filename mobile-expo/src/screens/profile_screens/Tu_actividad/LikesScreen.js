// src/screens/profile_screens/Tu_actividad/LikesScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function LikesScreen({ navigation }) {
  const { colors } = useTheme();
    
  const [selected, setSelected] = useState([]);
  const publications = [
    'Publicación 1',
    'Publicación 2',
    'Publicación 3',
    'Publicación 4',
    'Publicación 5',
    'Publicación 6',
  ];

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => {
        setSelected(prev =>
          prev.includes(index)
            ? prev.filter(i => i !== index)
            : [...prev, index]
        );
      }}
    >
      <Text style={[styles.cardText, { color: colors.text }]}>{item}</Text>

      {selected.includes(index) && (
        <Ionicons
          name="checkmark-circle"
          size={24}
          color="#94BA46"
          style={styles.check}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Me gusta</Text>
      </View>

      <FlatList
        data={publications}
        numColumns={3}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.grid}
      />

      {selected.length > 0 && (
        <TouchableOpacity style={[styles.button, {backgroundColor: colors.botonrojo}]}>
          <Text style={styles.buttonText}>Ya no me gusta</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  grid: {
    paddingHorizontal: 10,
  },
  card: {
    width: '31%',
    height: 120,
    margin: '1%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardText: {
    textAlign: 'center',
  },
  check: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  button: {
    transform: [{ translateY: 410 }],
    margin: 20,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});