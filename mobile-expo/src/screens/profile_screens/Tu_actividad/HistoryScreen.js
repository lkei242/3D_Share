import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen({ navigation }) {
  const [selected, setSelected] = useState([]);

  const historyPosts = [
    'Publicación 1',
    'Publicación 2',
    'Publicación 3',
    'Publicación 4',
    'Publicación 5',
    'Publicación 6',
  ];

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelected(prev =>
          prev.includes(index)
            ? prev.filter(i => i !== index)
            : [...prev, index]
        );
      }}
    >
      <Text style={styles.cardText}>{item}</Text>

      {selected.includes(index) && (
        <Ionicons
          name="checkmark-circle"
          size={24}
          color="#00FF88"
          style={styles.check}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color="#FFF"
          />
        </TouchableOpacity>

        <Text style={styles.title}>Historial</Text>
      </View>

      <FlatList
        data={historyPosts}
        numColumns={3}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.grid}
      />

      {selected.length > 0 && (
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>
            Eliminar
          </Text>
        </TouchableOpacity>
      )}

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
    paddingTop: 50,
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  title: {
    color: '#FFF',
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
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  cardText: {
    color: '#FFF',
    textAlign: 'center',
  },

  check: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  button: {
    margin: 20,
    backgroundColor: '#fc3535',
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