import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

export default function EditEmailScreen({ navigation }) {
  const [email, setEmail] = useState('');
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
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#222' : '#E5E5E5',
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={25}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            { color: colors.text }
          ]}
        >
          Cambiar correo electrónico
        </Text>
      </View>

      <View style={styles.content}>

        <Text
          style={[
            styles.label,
            { color: colors.text }
          ]}
        >
          Correo
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark
                ? '#1E1E1E'
                : '#F5F5F5',
              borderColor: isDark
                ? '#333'
                : '#DCDCDC',
              color: colors.text,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholder="correo@ejemplo.com"
          placeholderTextColor={
            isDark ? '#777' : '#999'
          }
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50, // 👈 clave (ajústalo según dispositivo)
    paddingHorizontal: 20,
  },

  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    marginLeft: 15,
    fontFamily: 'Nunito-Bold',
  },

  content:{
    padding:25,
  },

  label:{
    color:'#FFF',
    fontSize:16,
    marginBottom:20,
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