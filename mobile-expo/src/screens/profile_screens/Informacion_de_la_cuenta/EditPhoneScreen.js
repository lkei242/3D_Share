import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EditPhoneScreen({ navigation }) {
  const [phone, setPhone] = useState('');

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={25}
            color="#FFF"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Cambiar Número de Teléfono
        </Text>
      </View>

      <View style={styles.content}>

        <Text style={styles.countryText}>
          +54 Argentina
        </Text>

    

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Ingrese su número"
          placeholderTextColor="#666"
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
    fontWeight:'bold',
    marginLeft:15,
    fontFamily: 'Nunito-Light',
  },

  content:{
    padding:25,
  },

  countrySelector:{
    marginBottom:25,
  },

  countryText:{
    color:'#FFF',
    fontSize:15,
    fontFamily: 'Nunito-Light',
    marginBottom:20,
  },

  input:{
    height:55,
    borderRadius:10,
    backgroundColor:'#1E1E1E',
    borderWidth:1,
    borderColor:'#333',
    paddingHorizontal:15,
    color:'#FFF',
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
    fontWeight:'bold',
    fontFamily: 'Nunito-Light',
  },
});