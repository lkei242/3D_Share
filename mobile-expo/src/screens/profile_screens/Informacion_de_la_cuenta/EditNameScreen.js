// src/screens/profile_screens/Informacion_de_la_cuenta/EditNameScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { auth, db } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function EditNameScreen({ route, navigation }) {
  const { currentProfileName, currentUsername } = route.params || {};
  const [profileName, setProfileName] = useState(currentProfileName || '');
  const [username, setUsername] = useState(currentUsername || '');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const handleSave = async () => {
    if (!profileName.trim() || !username.trim()) {
      alert('Los campos no pueden estar vacíos.');
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          profileName: profileName.trim(),
          username: username.trim().toLowerCase().replace('@', ''),
        });
        alert('Nombres actualizados con éxito.');
        navigation.goBack();
      }
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#121212' : '#FFFFFF', borderBottomColor: isDark ? '#222' : '#E5E5E5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
          <Ionicons name="arrow-back" size={25} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Cambiar nombres</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>Nombre de Perfil</Text>
        <TextInput
          style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC', color: colors.text }]}
          value={profileName}
          onChangeText={setProfileName}
          placeholder="Nombre de perfil"
          placeholderTextColor={isDark ? '#777' : '#999'}
          editable={!loading}
        />

        <Text style={[styles.label, { marginTop: 30, color: colors.text }]}>Nombre de Usuario</Text>
        <TextInput
          style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC', color: colors.text }]}
          value={username}
          onChangeText={setUsername}
          placeholder="Nombre de usuario"
          placeholderTextColor={isDark ? '#777' : '#999'}
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: '#546F1C' }]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.saveText}>Guardar</Text>
        )}
      </TouchableOpacity>
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
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    marginLeft: 15,
    fontFamily: 'Nunito-Bold',
  },
  content: {
    padding: 25,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    fontFamily: 'Nunito-Light',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    fontFamily: 'Nunito-Light',
  },
  saveButton: {
    position: 'absolute',
    bottom: 40,
    right: 25,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: '#FFF',
    fontFamily: 'Nunito-Bold',
  },
});