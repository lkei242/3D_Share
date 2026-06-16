// App.js
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Color fondo
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'react-native';
// Expo-navigation-bar
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
// Bottom Bar
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomTabBar from './src/screens/components/BottomTabBar';
// Pantallas de autenticación
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
// Pantallas principales
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import SearchScreen from './src/screens/SearchScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/profile_screens/SettingsScreen';
import AccountSwitcherScreen from './src/screens/profile_screens/AccountSwitcherScreen';
import ContactsScreen from './src/screens/profile_screens/ContactsScreen';
import SocialNetworksScreen from './src/screens/profile_screens/SocialNetworksScreen';
import AccountScreen from './src/screens/profile_screens/AccountScreen';
import SecurityScreen from './src/screens/profile_screens/SecurityScreen';
import NotificationsScreen from './src/screens/profile_screens/NotificationsScreen';
import PublishScreen from './src/screens/PublishScreen';
import ActivityScreen from './src/screens/profile_screens/ActivityScreen';
import PreferencesScreen from './src/screens/profile_screens/PreferencesScreen';
import LikesScreen from './src/screens/profile_screens/Tu_actividad/LikesScreen';

const MiTemaClaro = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF', // Fondo blanco para modo claro
    card: '#F5F5F5',
    text: '#000000',
  },
};
// 2. Defines tus colores para el Modo Oscuro
const MiTemaOscuro = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#121212', // Fondo oscuro
    card: '#1C1C1C',
    text: '#FFFFFF',
  },
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}  // tu componente custom
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const scheme = useColorScheme(); // Retorna 'light' o 'dark' según el sistema operativo
  useEffect(() => {
    const isDark = scheme === 'dark';
    if (Platform.OS === 'android') {
      // Barra de estado superior: transparente
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
      // Barra de navegación inferior
      if (NavigationBar) {
        const bgColor = isDark ? '#0B0B0B' : '#FFFFFF';
        const buttonStyle = isDark ? 'light' : 'dark';
        if (typeof NavigationBar.setBackgroundColorAsync === 'function') {
          NavigationBar.setBackgroundColorAsync(bgColor).catch(err => console.log(err));
        }
        if (typeof NavigationBar.setButtonStyleAsync === 'function') {
          NavigationBar.setButtonStyleAsync(buttonStyle).catch(err => console.log(err));
        }
      }
    }
  }, [scheme]);
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={scheme === 'dark' ? MiTemaOscuro : MiTemaClaro}>
        <StatusBar 
          translucent={true} 
          backgroundColor="transparent" 
          style={scheme === 'dark' ? 'light' : 'dark'} 
        />
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="AccountSwitcher" component={AccountSwitcherScreen} />
          <Stack.Screen name="Contacts" component={ContactsScreen} />
          <Stack.Screen name="SocialNetworks" component={SocialNetworksScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Account" component={AccountScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Security" component={SecurityScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Publish" component={PublishScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Activity" component={ActivityScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Preferences" component={PreferencesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="LikesScreen" component={LikesScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}