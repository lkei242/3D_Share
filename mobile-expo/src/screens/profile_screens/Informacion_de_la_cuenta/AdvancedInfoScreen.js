import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

export default function AdvancedInfoScreen({ navigation }) {
  const [profileName, setProfileName] = useState('');
  const [presentation, setPresentation] = useState('');
  const [gender, setGender] = useState('');
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const handleSave = () => {
    console.log('Información guardada');
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
            styles.headerTitle,
            { color: colors.text }
          ]}
        >
          Información Avanzada
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.avatarContainer}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: isDark
                  ? '#1E1E1E'
                  : '#F5F5F5',
              },
            ]}
          >
            <Ionicons
              name="person"
              size={40}
              color={isDark ? '#999' : '#666'}
            />
          </View>

          <Text
            style={[
              styles.avatarText,
              { color: colors.text }
            ]}
          >
            Foto de perfil
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonSpacing}
          onPress={() =>
            navigation.navigate('PresentationScreen')
          }
        >
          <View
            style={[
              styles.selectBox,
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
              style={{
                color: isDark ? '#777' : '#555',
              }}
            >
              Editar presentación
            </Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? '#AAA' : '#666'}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate('GenderScreen')
          }
        >
          <View
            style={[
              styles.selectBox,
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
              style={{
                color: isDark ? '#777' : '#555',
              }}
            >
              Editar Sexo
            </Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? '#AAA' : '#666'}
            />
          </View>
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

  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 15,
  },

  content: {
    padding: 20,
  },

  avatarContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  avatarText: {
    color: '#FFF',
    fontSize: 16,
  },

  label: {
    color: '#FFF',
    fontSize: 15,
    marginBottom: 8,
    marginTop: 10,
  },

  input: {
    height: 50,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#FFF',
    marginBottom: 15,
  },

  presentationInput: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  selectBox: {
    height: 50,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  saveButton: {
    backgroundColor: '#546F1C',
    marginTop: 40,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },

  saveText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSpacing: {
    marginBottom: 15,
  },
});