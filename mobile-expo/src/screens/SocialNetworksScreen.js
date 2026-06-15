import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React from 'react';
import { FontAwesome } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';

const socialApps = [
  {
    id: '1',
    name: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
  },
  {
    id: '2',
    name: 'X',
    icon: 'twitter',
    color: '#FFF',
  },
  {
    id: '3',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
  },
  {
    id: '4',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E1306C',
  },
  {
    id: '5',
    name: 'TikTok',
    icon: 'music',
    color: '#FFF',
  },
];

export default function SocialNetworksScreen() {
  return (
    <KeyboardAwareScrollView
    enableOnAndroid
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={styles.ScrollContainer}
    style={{ backgroundColor: '#121212' }}
    >
        <View style={styles.container}>
        <Text style={styles.title}>
            Redes Sociales
        </Text>

        <View style={styles.card}>
            <TextInput
            placeholder="Buscar"
            placeholderTextColor="#888"
            style={styles.search}
            />

            <Text style={styles.subtitle}>
            Tus Formas de Contacto
            </Text>

            {socialApps.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    style={styles.item}
                >
                    <View style={styles.iconContainer}>
                    <FontAwesome
                        name={item.icon}
                        size={32}
                        color={item.color}
                    />
                    </View>

                    <Text style={styles.itemText}>
                    {item.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
        </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#121212',
        paddingTop: 60,
        paddingHorizontal: 20,
    },

    title: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },

    card: {
        backgroundColor: '#1E1E1E',
        borderRadius: 15,
        padding: 20,
    },

    search: {
        backgroundColor: '#2A2A2A',
        borderRadius: 10,
        padding: 12,
        color: '#FFF',
        marginBottom: 15,
    },

    subtitle: {
        color: '#AAA',
        marginBottom: 20,
    },

    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },

    circle: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FFF',
        marginRight: 15,
    },

    itemText: {
        marginLeft: 15, // o 15 si lo querés más separado
        color: '#FFF',
        fontSize: 16,
    },
    iconContainer: {
        width: 40, // mismo espacio para todos los íconos
        alignItems: 'center',
    },
    ScrollContainer: {
        flexGrow: 1,
        paddingBottom: 20,
    },

});