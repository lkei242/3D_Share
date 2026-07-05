// App.js
import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { auth } from './src/screens/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Color fondo
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Platform, StatusBar } from 'react-native';
// Expo-navigation-bar
import * as NavigationBar from 'expo-navigation-bar';
// Bottom Bar
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomTabBar from './src/screens/components/BottomTabBar';
// Tema (controlado desde Preferencias)
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
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
import AccountScreen from './src/screens/profile_screens/AccountScreen';
import SecurityScreen from './src/screens/profile_screens/SecurityScreen';
import NotificationsScreen from './src/screens/profile_screens/NotificationsScreen';
import PublishScreen from './src/screens/PublishScreen';
import ActivityScreen from './src/screens/profile_screens/ActivityScreen';
import PreferencesScreen from './src/screens/profile_screens/PreferencesScreen';
import LikesScreen from './src/screens/profile_screens/Tu_actividad/LikesScreen';
import SavedScreen from './src/screens/profile_screens/Tu_actividad/SavedScreen';
import ConnectedDevicesScreen from './src/screens/profile_screens/ConnectedDevicesScreen';
import ChangePasswordScreen from './src/screens/profile_screens/Tu_cuenta/ChangePasswordScreen';
import NewPasswordScreen from './src/screens/profile_screens/Tu_cuenta/NewPasswordScreen';
import DeactivateAccountScreen from './src/screens/profile_screens/Tu_cuenta/DeactivateAccountScreen';
import DeactivateAccountPasswordScreen from './src/screens/profile_screens/Tu_cuenta/DeactivateAccountPasswordScreen';
import EditProfileInfoScreen from './src/screens/profile_screens/Informacion_de_la_cuenta/EditProfileInfoScreen';
import AdvancedInfoScreen from './src/screens/profile_screens/Informacion_de_la_cuenta/AdvancedInfoScreen';
import PresentationScreen from './src/screens/profile_screens/Informacion_de_la_cuenta/PresentationScreen';
import EditNameScreen from './src/screens/profile_screens/Informacion_de_la_cuenta/EditNameScreen';
import EditEmailScreen from './src/screens/profile_screens/Informacion_de_la_cuenta/EditEmailScreen';
import EditPhoneScreen from './src/screens/profile_screens/Informacion_de_la_cuenta/EditPhoneScreen';
import EditBirthDateScreen from './src/screens/profile_screens/Informacion_de_la_cuenta/EditBirthDateScreen';
import ReauthenticateScreen from './src/screens/profile_screens/Informacion_de_la_cuenta/ReauthenticateScreen';
import ChatDetailsScreen from './src/screens/chats_screens/ChatDetailsScreen';
import PostDetailScreen from './src/screens/components/PostDetailScreen';
import EditPostScreen from './src/screens/EditPostScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import UserProfileContactsScreen from './src/screens/UserProfileContactsScreen';

const MiTemaClaro = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF', // Fondo blanco para modo claro
    inputBackground: '#E8E8E8',
    letraschicas: '#546F1C',
    avatarborder: '#cfcece',
    card: '#F5F5F5',
    text: '#000000',
    textnegrita: '#1C1C1C',
    botonrojo: '#a70d0d',
  },
};
// 2. Defines tus colores para el Modo Oscuro
const MiTemaOscuro = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#121212', // Fondo oscuro
    inputBackground: '#ffffff',
    letraschicas: '#94BA46',
    avatarborder: '#2C2C2C',
    card: '#1C1C1C',
    text: '#FFFFFF',
    textnegrita: '#FFFFFF',
    botonrojo: '#a70d0d',
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

function AppContent() {
  const { scheme } = useAppTheme();
  const [authReady, setAuthReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Welcome');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!authReady) {
        // Solo en el primer disparo decidimos la ruta inicial
        setInitialRoute(user ? 'MainTabs' : 'Welcome');
        setAuthReady(true);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // ... tu código de NavigationBar/StatusBar igual que antes
    const isDark = scheme === 'dark';
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
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

  if (!authReady) {
    // Pantalla de carga mientras Firebase determina si hay sesión
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: scheme === 'dark' ? '#121212' : '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#546F1C" />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={scheme === 'dark' ? MiTemaOscuro : MiTemaClaro}>
        <StatusBar
          translucent={true}
          backgroundColor="transparent"
          style={scheme === 'dark' ? 'light' : 'dark'}
        />
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="UserProfileContacts" component={UserProfileContactsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="AccountSwitcher" component={AccountSwitcherScreen} />
          <Stack.Screen name="Contacts" component={ContactsScreen} />
          <Stack.Screen name="Account" component={AccountScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Security" component={SecurityScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Publish" component={PublishScreen} options={{ headerShown: false }} />
          <Stack.Screen name="EditPost" component={EditPostScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Activity" component={ActivityScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Preferences" component={PreferencesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="LikesScreen" component={LikesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SavedScreen" component={SavedScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ConnectedDevicesScreen" component={ConnectedDevicesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="NewPasswordScreen" component={NewPasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DeactivateAccountScreen" component={DeactivateAccountScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DeactivateAccountPasswordScreen" component={DeactivateAccountPasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="EditProfileInfoScreen" component={EditProfileInfoScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdvancedInfoScreen" component={AdvancedInfoScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PresentationScreen" component={PresentationScreen} options={{ headerShown: false }} />
          <Stack.Screen name="EditNameScreen" component={EditNameScreen} options={{ headerShown: false }} />
          <Stack.Screen name="EditEmailScreen" component={EditEmailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="EditPhoneScreen" component={EditPhoneScreen} options={{ headerShown: false }} />
          <Stack.Screen name="EditBirthDateScreen" component={EditBirthDateScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ReauthenticateScreen" component={ReauthenticateScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ChatDetail" component={ChatDetailsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}