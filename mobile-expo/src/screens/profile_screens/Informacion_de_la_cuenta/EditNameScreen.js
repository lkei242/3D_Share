import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EditNameScreen({ navigation }) {
  const [profileName, setProfileName] = useState('');
  const [username, setUsername] = useState('');

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={25} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Cambiar nombre de usuario
        </Text>
      </View>

      <View style={styles.content}>

        <Text style={styles.label}>
          Nombre de Perfil
        </Text>

        <TextInput
          style={styles.input}
          value={profileName}
          onChangeText={setProfileName}
          placeholder="Nombre de perfil"
          placeholderTextColor="#777"
        />

        <Text style={[styles.label,{marginTop:30}]}>
          Nombre de Usuario
        </Text>

        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Nombre de usuario"
          placeholderTextColor="#777"
        />

      </View>
      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveText}>
          Guardar
        </Text>
      </TouchableOpacity>
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
    paddingBottom:18,
    borderBottomWidth:1,
    borderBottomColor:'#222',
  },

  headerTitle:{
    color:'#FFF',
    fontSize:18,
    marginLeft:15,
    fontFamily: 'Nunito-Bold',
  },

  content:{
    padding:25,
  },

  label:{
    color:'#FFF',
    fontSize:16,
    marginBottom:10,
    fontFamily: 'Nunito-Light',
  },

  input:{
    backgroundColor:'#1E1E1E',
    borderWidth:1,
    borderColor:'#333',
    borderRadius:10,
    color:'#FFF',
    paddingHorizontal:15,
    height:50,
    fontFamily: 'Nunito-Light',
  },

  saveButton:{
    position:'absolute',
    bottom:40,
    right:25,
    backgroundColor:'#546F1C',
    paddingHorizontal:25,
    paddingVertical:12,
    borderRadius:10,
  },

  saveText:{
    color:'#FFF',
    fontFamily: 'Nunito-Bold',
  },
});