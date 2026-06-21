import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

export default function PresentationScreen({ navigation }) {
  const [presentation, setPresentation] = useState('');

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
          Presentación
        </Text>
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.label,
            { color: colors.text }
          ]}
        >
          Editar presentación
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
              borderColor: isDark ? '#333' : '#DCDCDC',
            },
          ]}
          multiline
          value={presentation}
          onChangeText={setPresentation}
          placeholder="Escribe tu presentación..."
          placeholderTextColor={
            isDark ? '#777' : '#999'
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 15,
  },

  content: {
    padding: 20,
  },

  label: {
    marginBottom: 15,
    fontSize: 16,
  },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    height: 180,
    padding: 15,
    textAlignVertical: 'top',
    fontSize: 16,
  },
});