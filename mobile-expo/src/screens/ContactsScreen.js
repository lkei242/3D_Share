import React from 'react';
import { Dimensions, ScrollView } from 'react-native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
} from 'react-native';
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
  return (
    <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.title}>Contactos</Text>
        </View>

        {/* Estadísticas */}
        <View style={styles.stats}>
            <Text style={styles.statText}>0 seguidores</Text>
            <Text style={styles.statText}>6 seguidos</Text>
        </View>



        {/* AQUÍ VA EL SWIPE */}
        <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
        >

            {/* Seguidores */}
            <View style={{ width: width - 40 }}>
            <Text style={styles.sectionTitle}>
                Seguidores
            </Text>
            <TextInput
                placeholder="Buscar"
                placeholderTextColor="#999"
                style={styles.search}
            />
            <FlatList
                data={followers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                <TouchableOpacity style={styles.userRow}>
                    <Ionicons
                    name="person-circle"
                    size={40}
                    color="#fff"
                    />

                    <Text style={styles.userName}>
                    {item.name}
                    </Text>
                </TouchableOpacity>
                )}
            />
            </View>

            {/* Seguidos */}
            <View style={{ width: width - 40 }}>
            <Text style={styles.sectionTitle}>
                Seguidos
            </Text>
            <TextInput
                placeholder="Buscar"
                placeholderTextColor="#999"
                style={styles.search}
            />
            <FlatList
                data={following}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                <TouchableOpacity style={styles.userRow}>
                    <Ionicons
                    name="person-circle"
                    size={40}
                    color="#fff"
                    />

                    <Text style={styles.userName}>
                    {item.name}
                    </Text>
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
    backgroundColor: '#121212',
    paddingTop: 50,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  title: {
    color: '#fff',
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
    color: '#fff',
    fontSize: 16,
  },

  search: {
    backgroundColor: '#1f1f1f',
    color: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1f1f',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
  },

  userName: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
});