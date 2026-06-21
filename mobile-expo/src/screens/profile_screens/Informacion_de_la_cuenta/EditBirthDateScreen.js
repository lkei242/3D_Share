import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function EditBirthDateScreen({ navigation }) {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const onChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formattedDate = date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={26}
            color="#FFF"
          />
        </TouchableOpacity>

        <Text style={styles.title}>
          Fecha de Nacimiento
        </Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.dateText}>
            {formattedDate}
          </Text>

          <Ionicons
            name="chevron-down"
            size={18}
            color="#AAA"
          />
        </TouchableOpacity>

        {showPicker && (
            <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChange}
            />
        )}
      </View>

      <TouchableOpacity
        style={styles.saveButton}
      >
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
    paddingBottom:20,
    borderBottomWidth:1,
    borderBottomColor:'#222',
  },

  title:{
    color:'#FFF',
    fontSize:20,
    marginLeft:15,
    fontFamily: 'Nunito-Bold',
  },

  content:{
    padding:25,
  },

  dateButton:{
    height:55,
    backgroundColor:'#1E1E1E',
    borderWidth:1,
    borderColor:'#333',
    borderRadius:10,
    paddingHorizontal:15,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
  },

  dateText:{
    color:'#FFF',
    fontSize:15,
    fontFamily: 'Nunito-Light',
  },

  saveButton:{
    position:'absolute',
    right:25,
    bottom:40,
    backgroundColor:'#546F1C',
    paddingHorizontal:25,
    paddingVertical:12,
    borderRadius:10,
  },

  saveText:{
    color:'#FFF',
    fontSize:15,
    fontFamily: 'Nunito-Bold',
  },
});