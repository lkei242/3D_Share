import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Feather, Ionicons, Octicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const GREEN = '#546F1C', BLACK = '#0B0F03';

function TabButton({ active, onPress, children }) {
  // 1. Valor animado: 1 = normal, 1.25 = activo
  const scale = useRef(new Animated.Value(active ? 1.25 : 1)).current;
  // 2. Opacidad del gradiente de fondo
  const bgOpacity = useRef(new Animated.Value(active ? 1 : 0)).current;

  // 3. Cuando cambia "active", disparar ambas animaciones en paralelo
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: active ? 1.25 : 1,
        friction: 5,      // Qué tan "rebotante" es (menor = más rebote)
        tension: 80,      // Velocidad de la animación
        useNativeDriver: true,
      }),
      Animated.timing(bgOpacity, {
        toValue: active ? 1 : 0,
        duration: 200,    // 200ms para que el fondo aparezca suavemente
        useNativeDriver: true,
      }),
    ]).start();
  }, [active]);

  return (
    <TouchableOpacity
      style={styles.tabItem}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Fondo con gradiente animado */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity, borderRadius: 20 }]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%"   stopColor={GREEN} />
              <Stop offset="94%"  stopColor={BLACK} />
              <Stop offset="100%" stopColor="#0B0F03" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#grad)" />
        </Svg>
      </Animated.View>

      {/* Ícono animado con escala */}
      <Animated.View style={[styles.iconContainer, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

const TAB_ICONS = ['Home', 'Chat', 'Search', 'Profile'];

export default function BottomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        const icon = () => {
          switch (route.name) {
            case 'Home':    return <Feather name="home"          size={24} color="#FFF" />;
            case 'Chat':    return <Ionicons name="chatbox-outline" size={24} color="#FFF" />;
            case 'Search':  return <Feather name="search"         size={24} color="#FFF" />;
            case 'Profile': return <Octicons name="person"        size={24} color="#FFF" />;
            default:        return null;
          }
        };
        return (
          <TabButton key={route.key} active={isFocused} onPress={onPress}>
            {icon()}
          </TabButton>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 10,
    paddingHorizontal: 24,
  },
  tabItem: {
    flex: 1,
    height: 34,
    marginHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});