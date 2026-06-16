import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CommentsScreen({ navigation }) {
  const [selectedComments, setSelectedComments] = useState([]);

  const posts = [
    {
      id: 1,
      caption: 'Pie de foto',
      comments: ['Comentario 1', 'Comentario 2'],
    },
    {
      id: 2,
      caption: 'Pie de foto',
      comments: ['Comentario 1', 'Comentario 2'],
    },
    {
      id: 3,
      caption: 'Pie de foto',
      comments: ['Comentario 1', 'Comentario 2'],
    },
  ];

  const toggleComment = (key) => {
    if (selectedComments.includes(key)) {
      setSelectedComments(
        selectedComments.filter(item => item !== key)
      );
    } else {
      setSelectedComments([...selectedComments, key]);
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color="#FFF"
          />
        </TouchableOpacity>

        <Text style={styles.title}>Comentarios</Text>
      </View>

      <ScrollView>

        {posts.map((post) => (
          <TouchableOpacity
            key={post.id}
            style={styles.postContainer}
            onPress={() =>
              navigation.navigate('PostCommentsScreen', {
                postId: post.id,
              })
            }
          >
            <View style={styles.postRow}>

              <View style={styles.thumbnail}>
                <Text style={styles.thumbnailText}>
                  Publicación {post.id}
                </Text>
              </View>

              <View style={styles.info}>

                <Text style={styles.caption}>
                  {post.caption}
                </Text>

                {post.comments.map((comment, index) => {
                  const key = `${post.id}-${index}`;

                  return (
                    <TouchableOpacity
                      key={key}
                      style={styles.commentRow}
                      onPress={() => toggleComment(key)}
                    >
                      <Text style={styles.commentText}>
                        {comment}
                      </Text>

                      {selectedComments.includes(key) && (
                        <Ionicons
                          name="checkbox"
                          size={20}
                          color="#00FF88"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}

              </View>

            </View>
          </TouchableOpacity>
        ))}

      </ScrollView>

      {selectedComments.length > 0 && (
        <TouchableOpacity style={styles.deleteButton}>
            <Text style={styles.deleteText}>
            Eliminar ({selectedComments.length})
            </Text>
        </TouchableOpacity>
        )}

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
    paddingTop: 50,
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
  },

  postContainer: {
    marginHorizontal: 15,
    marginBottom: 20,
  },

  postRow: {
    flexDirection: 'row',
  },

  thumbnail: {
    width: 90,
    height: 90,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  thumbnailText: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 12,
  },

  info: {
    flex: 1,
    marginLeft: 15,
  },

  caption: {
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 8,
  },

  commentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  commentText: {
    color: '#DDD',
  },

  deleteButton: {
    margin: 15,
    backgroundColor: '#fc3535',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },

  deleteText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});