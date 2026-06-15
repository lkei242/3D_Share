import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AccountScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <Text style={styles.title}>
          Tu cuenta
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>
            Información de la cuenta
          </Text>

          <Ionicons
            name="chevron-forward-circle"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>
            Cambiar contraseña
          </Text>

          <Ionicons
            name="chevron-forward-circle"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>
            Descargar tus datos
          </Text>

          <Ionicons
            name="chevron-forward-circle"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>
            Desactivar cuenta
          </Text>

          <Ionicons
            name="chevron-forward-circle"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 50,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 25,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#FFFFFF',
  },

  content: {
    paddingHorizontal: 20,
  },

  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },

  optionText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});