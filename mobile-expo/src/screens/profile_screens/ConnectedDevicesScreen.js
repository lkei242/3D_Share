import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

export default function ConnectedDevicesScreen({ navigation }) {
  const devices = [
    { id: 1, name: 'Celular 1', current: true },
    { id: 2, name: 'Celular 2', current: false },
    { id: 3, name: 'Celular 3', current: false },
    { id: 4, name: 'Celular 4', current: false },
  ];
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [selectedDevices, setSelectedDevices] = useState([]);
  const toggleDevice = (id) => {
    setSelectedDevices(prev =>
      prev.includes(id)
        ? prev.filter(deviceId => deviceId !== id)
        : [...prev, id]
    );
  };
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background }
      ]}
    >

      <View
        style={[
          styles.header,
          {
            borderBottomColor: isDark
              ? '#222'
              : '#E5E5E5',
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.title,
            { color: colors.text }
          ]}
        >
          Sesiones
        </Text>
      </View>

      <View style={styles.listContainer}>
        {devices.map(device => (
          <TouchableOpacity
            key={device.id}
            style={[
              styles.deviceRow,
              {
                backgroundColor: isDark
                  ? '#1E1E1E'
                  : '#F5F5F5',
              },
            ]}
            onPress={() => toggleDevice(device.id)}
          >
            <View style={styles.leftSide}>
              <Ionicons
                name={
                  selectedDevices.includes(device.id)
                    ? 'checkbox'
                    : 'square-outline'
                }
                size={22}
                color={
                  selectedDevices.includes(device.id)
                    ? '#546F1C'
                    : colors.text
                }
              />

              <Text
                style={[
                  styles.deviceText,
                  { color: colors.text }
                ]}
              >
                {device.name}
              </Text>
            </View>

            {device.current && (
              <Text
                style={[
                  styles.currentText,
                  {
                    color: isDark
                      ? '#999'
                      : '#666',
                  },
                ]}
              >
                actual
              </Text>
            )}
          </TouchableOpacity>
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
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
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