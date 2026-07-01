import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Feather, Ionicons, Octicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const GREEN = '#546F1C', BLACK = '#0B0F03';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

function TabButton({ active, onPress, children }) {
  const scale = useRef(new Animated.Value(active ? 1.25 : 1)).current;
  const bgOpacity = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: active ? 1.25 : 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(bgOpacity, {
        toValue: active ? 1 : 0,
        duration: 200,
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
      <AnimatedGradient
        colors={[GREEN, BLACK, '#0B0F03']}
        locations={[0, 0.94, 1]}
        style={[StyleSheet.absoluteFill, { opacity: bgOpacity, borderRadius: 20 }]}
      />

      <Animated.View style={[styles.iconContainer, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function BottomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[
      styles.tabBar, 
      { 
        backgroundColor: colors.card, 
        borderTopColor: colors.border,
        paddingBottom: insets.bottom + 8 
      }
    ]}>
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

        // Si está seleccionado, el icono es blanco (sobre el gradiente verde).
        // Si no está seleccionado, usa el color de texto del tema con opacidad.
        const iconColor = isFocused 
          ? "#FFF" 
          : (colors.text === '#FFFFFF' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)');

        const icon = () => {
          switch (route.name) {
            case 'Home':    return <Feather name="home"          size={24} color={iconColor} />;
            case 'Chat':    return <Ionicons name="chatbox-outline" size={24} color={iconColor} />;
            case 'Search':  return <Feather name="search"         size={24} color={iconColor} />;
            case 'Profile': return <Octicons name="person"        size={24} color={iconColor} />;
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
    borderTopWidth: 1,
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