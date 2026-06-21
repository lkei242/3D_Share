import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PresentationScreen({ navigation }) {
  const [presentation, setPresentation] = useState('');

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.title}>
          Presentación
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>
          Editar presentación
        </Text>

        <TextInput
          style={styles.input}
          multiline
          value={presentation}
          onChangeText={setPresentation}
          placeholder="Escribe tu presentación..."
          placeholderTextColor="#777"
        />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    backgroundColor:'#121212',
  },

  header:{
    flexDirection:'row',
    alignItems:'center',
    paddingTop:55,
    paddingHorizontal:20,
    paddingBottom:20,
    borderBottomWidth:1,
    borderBottomColor:'#222',
  },

  title:{
    color:'#FFF',
    fontSize:22,
    fontWeight:'bold',
    marginLeft:15,
  },

  content:{
    padding:20,
  },

  label:{
    color:'#FFF',
    marginBottom:15,
    fontSize:16,
  },

  input:{
    backgroundColor:'#1E1E1E',
    borderWidth:1,
    borderColor:'#333',
    borderRadius:10,
    color:'#FFF',
    height:180,
    padding:15,
    textAlignVertical:'top',
  },
});