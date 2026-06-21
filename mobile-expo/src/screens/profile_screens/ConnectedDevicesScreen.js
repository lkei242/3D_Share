import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ConnectedDevicesScreen({ navigation }) {
  const devices = [
    { id: 1, name: 'Celular 1', current: true },
    { id: 2, name: 'Celular 2', current: false },
    { id: 3, name: 'Celular 3', current: false },
    { id: 4, name: 'Celular 4', current: false },
  ];

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

        <Text style={styles.title}>
          Sesiones
        </Text>
      </View>

      <View style={styles.listContainer}>
        {devices.map(device => (
          <View
            key={device.id}
            style={styles.deviceRow}
          >
            <View style={styles.leftSide}>
              <Ionicons
                name="square-outline"
                size={22}
                color="#FFF"
              />

              <Text style={styles.deviceText}>
                {device.name}
              </Text>
            </View>

            {device.current && (
              <Text style={styles.currentText}>
                actual
              </Text>
            )}
          </View>
        ))}
      </View>

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
    marginBottom: 30,
  },

  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
  },

  listContainer: {
    paddingHorizontal: 20,
  },

  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
  },

  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  deviceText: {
    color: '#FFF',
    fontSize: 16,
    marginLeft: 12,
  },

  currentText: {
    color: '#999',
    fontSize: 14,
  },
});