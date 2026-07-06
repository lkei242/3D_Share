// src/screens/profile_screens/Informacion_de_la_cuenta/EditProfileInfoScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function EditProfileInfoScreen({ navigation }) {
  const [profileName, setProfileName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  // Cargar datos actuales desde Firestore
  const fetchUserData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfileName(data.profileName || '');
        setUsername(data.username ? `@${data.username}` : '');
        setEmail(data.email || user.email || '');
        setPhone(data.phone || '');
        setBirthDate(data.birthDate || '');
      } else {
        setEmail(user.email || '');
        setProfileName(user.displayName || '');
      }
    } catch (error) {
      console.log('Error fetching user data in EditProfileInfoScreen:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#121212' : '#FFFFFF', borderBottomColor: isDark ? '#222' : '#E5E5E5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Editar tu información</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Nombre de perfil */}
        <TouchableOpacity
          style={styles.field}
          onPress={() => navigation.navigate('EditNameScreen', { currentProfileName: profileName, currentUsername: username.replace('@', '') })}
        >
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.text }]}>Nombre de perfil</Text>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAA' : '#666'} />
          </View>
          <View style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC' }]}>
            <Text style={[styles.valueText, { color: isDark ? '#ccc' : '#444' }]}>
              {profileName || 'Ingrese su nombre'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Nombre de usuario */}
        <TouchableOpacity
          style={styles.field}
          onPress={() => navigation.navigate('EditNameScreen', { currentProfileName: profileName, currentUsername: username.replace('@', '') })}
        >
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.text }]}>Nombre de usuario</Text>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAA' : '#666'} />
          </View>
          <View style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC' }]}>
            <Text style={[styles.valueText, { color: isDark ? '#ccc' : '#444' }]}>
              {username || 'Ingrese su nombre de usuario'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Email (solo lectura) */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Correo electrónico</Text>
          <View style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC' }]}>
            <Text style={[styles.valueText, { color: isDark ? '#ccc' : '#444' }]}>
              {email || 'Ingrese su correo'}
            </Text>
          </View>
        </View>

        {/* Teléfono */}
        <TouchableOpacity
          style={styles.field}
          onPress={() => navigation.navigate('EditPhoneScreen', { currentPhone: phone })}
        >
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.text }]}>Teléfono</Text>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAA' : '#666'} />
          </View>
          <View style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC' }]}>
            <Text style={[styles.valueText, { color: isDark ? '#ccc' : '#444' }]}>
              {phone || 'Ingrese su teléfono'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Fecha de nacimiento */}
        <TouchableOpacity
          style={styles.field}
          onPress={() => navigation.navigate('EditBirthDateScreen', { currentBirthDate: birthDate })}
        >
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.text }]}>Fecha de nacimiento</Text>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAA' : '#666'} />
          </View>
          <View style={[styles.input, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC' }]}>
            <Text style={[styles.valueText, { color: isDark ? '#ccc' : '#444' }]}>
              {birthDate || 'Seleccionar fecha'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Link a Información Avanzada */}
        <TouchableOpacity
          style={[styles.advancedLink, { borderTopColor: isDark ? '#2C2C2C' : '#E5E5E5' }]}
          onPress={() => navigation.navigate('AdvancedInfoScreen')}
        >
          <Text style={[styles.advancedLinkText, { color: isDark ? '#9DBD3F' : '#546F1C' }]}>
            Información avanzada
          </Text>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#9DBD3F' : '#546F1C'} />
        </TouchableOpacity>

      </ScrollView>
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
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    marginLeft: 15,
  },
  content: {
    padding: 20,
  },
  field: {
    marginBottom: 22,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Nunito-Light',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 15,
    fontFamily: 'Nunito-Light',
  },
  advancedLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 25,
    borderTopWidth: 1,
  },
  advancedLinkText: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
  },
});