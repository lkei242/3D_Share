import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function GenderScreen({ navigation }) {
  const [selected, setSelected] = useState('');

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.title}>
          Sexo
        </Text>
      </View>

      <View style={styles.content}>

        <TouchableOpacity
          style={styles.option}
          onPress={() => setSelected('Masculino')}
        >
          <Text style={styles.optionText}>
            Masculino
          </Text>

          {selected === 'Masculino' && (
            <Ionicons
              name="checkmark-circle"
              size={22}
              color="#94BA46"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => setSelected('Femenino')}
        >
          <Text style={styles.optionText}>
            Femenino
          </Text>

          {selected === 'Femenino' && (
            <Ionicons
              name="checkmark-circle"
              size={22}
              color="#94BA46"
            />
          )}
        </TouchableOpacity>

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
    marginLeft:15,
    fontFamily: 'Nunito-Bold',
  },

  content:{
    padding:20,
  },

  option:{
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    backgroundColor:'#1E1E1E',
    padding:18,
    borderRadius:12,
    marginBottom:15,
  },

  optionText:{
    color:'#FFF',
    fontSize:16,
    fontFamily: 'Nunito-Light',
  },
});