import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { auth, db } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function PresentationScreen({ navigation, route }) {
  const [presentation, setPresentation] = useState(route.params?.currentPresentation || '');
  const [loading, setLoading] = useState(false);

  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    setToastType(type);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToastMessage(''));
    }, 3000);
  };

  const validateOnBlur = () => {
    if (presentation.trim().length > 200) {
      return showToast('La presentación no puede superar los 200 caracteres.');
    }
  };

  const handleSave = async () => {
    const v = presentation.trim();
    if (v.length > 200) return showToast('La presentación no puede superar los 200 caracteres.');

    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        presentation: v,
      });
      showToast('Presentación actualizada con éxito.', 'success');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      showToast('No se pudo guardar la presentación.');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#121212' : '#FFFFFF', borderBottomColor: isDark ? '#222' : '#E5E5E5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Presentación</Text>

        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveHeaderButton}>
          {loading
            ? <ActivityIndicator size="small" color={isDark ? '#9DBD3F' : '#546F1C'} />
            : <Text style={[styles.saveHeaderText, { color: isDark ? '#9DBD3F' : '#546F1C' }]}>Guardar</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>Editar presentación</Text>

        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#DCDCDC' }]}
          multiline
          value={presentation}
          onChangeText={setPresentation}
          onBlur={validateOnBlur}
          placeholder="Escribe tu presentación..."
          placeholderTextColor={isDark ? '#777' : '#999'}
          maxLength={200}
        />
        <Text style={[styles.charCount, { color: isDark ? '#555' : '#999' }]}>
          {presentation.length}/200
        </Text>
      </View>

      {}
      {toastMessage !== '' && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: toastType === 'success' ? '#27AE60' : '#E74C3C',
              opacity: toastAnim,
              transform: [{
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              }],
            },
          ]}
        >
          <Ionicons
            name={toastType === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color="#FFF"
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 15,
  },

  content: {
    padding: 20,
  },

  label: {
    marginBottom: 15,
    fontSize: 16,
  },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    height: 180,
    padding: 15,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  saveHeaderButton: {
    marginLeft: 'auto',
    paddingHorizontal: 4,
  },
  saveHeaderText: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  charCount: {
    textAlign: 'right',
    marginTop: 6,
    fontSize: 12,
    fontFamily: 'Nunito-Light',
  },
    toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    flex: 1,
  },
});