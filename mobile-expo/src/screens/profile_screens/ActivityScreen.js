// src/screens/profile_screens/ActivityScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function ActivityScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';
  
  const options = [
    'Me gusta',
    'Comentarios',
    'Repost',
    'Guardados',
    'Historial',
    'Papelera',
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Tu Actividad</Text>
      </View>

      <ScrollView>
        {options.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.option, { borderTopColor: isDark ? '#333' : '#E0E0E0' }]}
            onPress={() => {
              if (item === 'Me gusta') {
                navigation.navigate('LikesScreen');
              }
              if (item === 'Comentarios') {
                navigation.navigate('CommentsScreen');
              }
              if (item === 'Repost') {
                navigation.navigate('RepostScreen');
              }
              if (item === 'Guardados') {
                navigation.navigate('SavedScreen');
              }
              if (item === 'Historial') {
                navigation.navigate('HistoryScreen');
              }
              if (item === 'Papelera') {
                navigation.navigate('TrashScreen');
              }
            }}
          >
            <Text style={[styles.optionText, { color: colors.text }]}>{item}</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderTopWidth: 1,
  },
  optionText: {
    fontSize: 18,
  },
});