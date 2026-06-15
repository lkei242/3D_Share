import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen({ navigation }) {
return (
    <View style={styles.container}>
    {/* Header */}
    <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.title}>Configuración</Text>
    </View>

    <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
        <Image
            source={require('../../assets/profile_picture.jpg')}
            style={styles.avatar}
        />
        <Text style={styles.username}>Nombre</Text>
        </View>

        <TouchableOpacity style={styles.option} onPress={() => navigation.navigate('Account')}>
        <Text style={styles.optionText}>Cuenta</Text>
        <Ionicons name="chevron-forward-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={() => navigation.navigate('Security')}>
        <Text style={styles.optionText}>Seguridad</Text>
        <Ionicons name="chevron-forward-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={() => navigation.navigate('Notifications')}>
        <Text style={styles.optionText}>Notificaciones</Text>
        <Ionicons name="chevron-forward-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
        <Text style={styles.optionText}>Preferencias</Text>
        <Ionicons name="chevron-forward-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
        <Text style={styles.optionText}>Tu Actividad</Text>
        <Ionicons name="chevron-forward-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
    </ScrollView>
    </View>
);
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingTop: 50,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 25,
    },

    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 15,
        color: '#FFFFFF',
    },

    content: {
        paddingHorizontal: 20,
    },

    profileSection: {
        alignItems: 'center',
        marginBottom: 30,
    },

    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#FFFFFF',
        marginBottom: 10,
    },

    username: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    option: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#FFFFFF',
    },

    optionText: {
        fontSize: 18,
        color: '#FFFFFF',
    },

    logoutButton: {
        backgroundColor: '#ff4d4d',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginVertical: 25,
    },

    logoutText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});