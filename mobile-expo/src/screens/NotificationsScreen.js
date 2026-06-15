import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen({ navigation }) {
  const [pauseAll, setPauseAll] = useState(false);
  const [messages, setMessages] = useState(true);
  const [following, setFollowing] = useState(true);
  const [followers, setFollowers] = useState(true);
  const [posts, setPosts] = useState(true);
  const [comments, setComments] = useState(true);

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
          Notificaciones
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Pausar todas</Text>
          <Switch
            value={pauseAll}
            onValueChange={setPauseAll}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Mensajes</Text>
          <Switch
            value={messages}
            onValueChange={setMessages}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Seguidos</Text>
          <Switch
            value={following}
            onValueChange={setFollowing}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Seguidores</Text>
          <Switch
            value={followers}
            onValueChange={setFollowers}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Publicaciones</Text>
          <Switch
            value={posts}
            onValueChange={setPosts}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Comentarios</Text>
          <Switch
            value={comments}
            onValueChange={setComments}
          />
        </View>
      </View>
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

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },

  label: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});