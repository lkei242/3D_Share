
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function ActivityScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const activityOptions = [
    { label: 'Me gusta', screen: 'LikesScreen' },
    { label: 'Guardados', screen: 'SavedScreen' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Tu Actividad</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activityOptions.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.option, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={[styles.optionText, { color: colors.text }]}>
              {item.label}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? '#AAA' : '#666'}
            />
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
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  content: {
    paddingHorizontal: 20,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 18,
  },
});