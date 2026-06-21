import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

export default function GenderScreen({ navigation }) {
  const [selected, setSelected] = useState('');
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
            backgroundColor: isDark ? '#121212' : '#FFFFFF',
            borderBottomColor: isDark ? '#222' : '#E5E5E5',
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={26}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.title,
            { color: colors.text }
          ]}
        >
          Sexo
        </Text>
      </View>

      <View style={styles.content}>

        <TouchableOpacity
          style={[
            styles.option,
            {
              backgroundColor: isDark
                ? '#1E1E1E'
                : '#F5F5F5',
              borderColor:
                selected === 'Masculino'
                  ? '#94BA46'
                  : isDark
                  ? '#333'
                  : '#DCDCDC',
            },
          ]}
          onPress={() => setSelected('Masculino')}
        >
          <Text
            style={[
              styles.optionText,
              { color: colors.text }
            ]}
          >
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
          style={[
            styles.option,
            {
              backgroundColor: isDark
                ? '#1E1E1E'
                : '#F5F5F5',
              borderColor:
                selected === 'Femenino'
                  ? '#94BA46'
                  : isDark
                  ? '#333'
                  : '#DCDCDC',
            },
          ]}
          onPress={() => setSelected('Femenino')}
        >
          <Text
            style={[
              styles.optionText,
              { color: colors.text }
            ]}
          >
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