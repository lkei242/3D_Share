// src/screens/profile_screens/NotificationsScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const [pauseAll, setPauseAll] = useState(false);
  const [messages, setMessages] = useState(true);
  const [following, setFollowing] = useState(true);
  const [followers, setFollowers] = useState(true);
  const [posts, setPosts] = useState(true);
  const [comments, setComments] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notificaciones</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.row, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Pausar todas</Text>
          <Switch value={pauseAll} onValueChange={setPauseAll} />
        </View>

        <View style={[styles.row, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Mensajes</Text>
          <Switch value={messages} onValueChange={setMessages} />
        </View>

        <View style={[styles.row, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Seguidos</Text>
          <Switch value={following} onValueChange={setFollowing} />
        </View>

        <View style={[styles.row, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Seguidores</Text>
          <Switch value={followers} onValueChange={setFollowers} />
        </View>

        <View style={[styles.row, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Publicaciones</Text>
          <Switch value={posts} onValueChange={setPosts} />
        </View>

        <View style={[styles.row, { borderBottomColor: isDark ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Comentarios</Text>
          <Switch value={comments} onValueChange={setComments} />
        </View>
      </View>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 18,
  },
});