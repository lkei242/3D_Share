import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

export default function EditProfileInfoScreen({ navigation }) {
  const [profileName, setProfileName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

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
            backgroundColor: isDark ? '#121212' : '#FFFFFF',
            borderBottomColor: isDark ? '#222' : '#E5E5E5',
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={26}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.title,
            { color: colors.text }
          ]}
        >
          Editar tu información
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* Nombre de perfil */}
        <TouchableOpacity
          style={styles.field}
          onPress={() => navigation.navigate('EditNameScreen')}
        >
          <View style={styles.labelRow}>
            <Text
              style={[
                styles.label,
                { color: colors.text }
              ]}
            >
              Nombre de perfil
            </Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? '#AAA' : '#666'}
            />
          </View>

          <View
            style={[
              styles.input,
              {
                backgroundColor: isDark
                  ? '#1E1E1E'
                  : '#F5F5F5',
                borderColor: isDark
                  ? '#333'
                  : '#DCDCDC',
              },
            ]}
          >
            <Text
              style={[
                styles.valueText,
                { color: isDark ? '#666' : '#888' }
              ]}
            >
              {profileName || 'Ingrese su nombre'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Nombre de usuario */}
        <TouchableOpacity
          style={styles.field}
          onPress={() => navigation.navigate('EditNameScreen')}
        >
          <View style={styles.labelRow}>
            <Text
              style={[
                styles.label,
                { color: colors.text }
              ]}
            >
              Nombre de usuario
            </Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? '#AAA' : '#666'}
            />
          </View>

          <View
            style={[
              styles.input,
              {
                backgroundColor: isDark
                  ? '#1E1E1E'
                  : '#F5F5F5',
                borderColor: isDark
                  ? '#333'
                  : '#DCDCDC',
              },
            ]}
          >
            <Text
              style={[
                styles.valueText,
                { color: isDark ? '#666' : '#888' }
              ]}
            >
              {username || 'Ingrese su nombre de usuario'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Email */}
        <TouchableOpacity
          style={styles.field}
          onPress={() => navigation.navigate('EditEmailScreen')}
        >
          <View style={styles.labelRow}>
            <Text
              style={[
                styles.label,
                { color: colors.text }
              ]}
            >
              Correo electrónico
            </Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? '#AAA' : '#666'}
            />
          </View>

          <View
            style={[
              styles.input,
              {
                backgroundColor: isDark
                  ? '#1E1E1E'
                  : '#F5F5F5',
                borderColor: isDark
                  ? '#333'
                  : '#DCDCDC',
              },
            ]}
          >
            <Text
              style={[
                styles.valueText,
                { color: isDark ? '#666' : '#888' }
              ]}
            >
              {email || 'Ingrese su correo'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Teléfono */}
        <TouchableOpacity
          style={styles.field}
          onPress={() => navigation.navigate('EditPhoneScreen')}
        >
          <View style={styles.labelRow}>
            <Text
              style={[
                styles.label,
                { color: colors.text }
              ]}
            >
              Teléfono
            </Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? '#AAA' : '#666'}
            />
          </View>

          <View
            style={[
              styles.input,
              {
                backgroundColor: isDark
                  ? '#1E1E1E'
                  : '#F5F5F5',
                borderColor: isDark
                  ? '#333'
                  : '#DCDCDC',
              },
            ]}
          >
            <Text
              style={[
                styles.valueText,
                { color: isDark ? '#666' : '#888' }
              ]}
            >
              {phone || 'Ingrese su teléfono'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Fecha de nacimiento */}
        <TouchableOpacity
          style={styles.field}
          onPress={() =>
            navigation.navigate('EditBirthDateScreen')
          }
        >
          <View style={styles.labelRow}>
            <Text
              style={[
                styles.label,
                { color: colors.text }
              ]}
            >
              Fecha de nacimiento
            </Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? '#AAA' : '#666'}
            />
          </View>

          <View
            style={[
              styles.input,
              {
                backgroundColor: isDark
                  ? '#1E1E1E'
                  : '#F5F5F5',
                borderColor: isDark
                  ? '#333'
                  : '#DCDCDC',
              },
            ]}
          >
            <Text
              style={[
                styles.valueText,
                { color: isDark ? '#666' : '#888' }
              ]}
            >
              {birthDate || 'Seleccionar fecha'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.advancedButton}
          onPress={() =>
            navigation.navigate('AdvancedInfoScreen')
          }
        >
          <Text
            style={[
              styles.advancedText,
              { color: isDark ? '#AAA' : '#666' }
            ]}
          >
            Opciones avanzadas
          </Text>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? '#AAA' : '#666'}
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
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },

  title: {
    color: '#FFF',
    fontSize: 22,
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
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Nunito-Light',
  },

  input: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 15,
    justifyContent: 'center', // centra el Text verticalmente
  },
  
  advancedButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 110,
    paddingVertical: 15,
  },

  advancedText: {
    color: '#AAA',
    fontSize: 16,
    fontFamily: 'Nunito-Light',
  },
  valueText:{
    color:'#666',
    fontSize:15,
    fontFamily: 'Nunito-Light',
  },
});