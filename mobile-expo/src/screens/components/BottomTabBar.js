import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import {
  Feather,
  Ionicons,
  Octicons,
} from '@expo/vector-icons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';

const GREEN = '#546F1C';

function TabButton({
  active,
  onPress,
  children,
}) {
  return (
    <TouchableOpacity
      style={styles.tabItem}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {active && (
        <Svg
          style={StyleSheet.absoluteFill}
          width="100%"
          height="100%"
        >
          <Defs>
            <LinearGradient
              id="grad"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <Stop
                offset="0%"
                stopColor={GREEN}
              />

              <Stop
                offset="94%"
                stopColor="#0B0F03"
              />

              <Stop
                offset="100%"
                stopColor="#0B0F03"
              />
            </LinearGradient>
          </Defs>

          <Rect
            width="100%"
            height="100%"
            fill="url(#grad)"
          />
        </Svg>
      )}

      <View style={styles.iconContainer}>
        {children}
      </View>
    </TouchableOpacity>
  );
}

export default function BottomTabBar({
  activeTab,
  navigation,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      <TabButton
        active={activeTab === 'home'}
        onPress={() => navigation.navigate('Home')}
      >
        <Feather
          name="home"
          size={28}
          color="#FFF"
        />
      </TabButton>

      <TabButton
        active={activeTab === 'chat'}
        onPress={() => navigation.navigate('Chat')}
      >
        <Ionicons
          name="chatbox-outline"
          size={28}
          color="#FFF"
        />
      </TabButton>

      <TabButton
        active={activeTab === 'search'}
        onPress={() => navigation.navigate('Search')}
      >
        <Feather
          name="search"
          size={28}
          color="#FFF"
        />
      </TabButton>

      <TabButton
        active={activeTab === 'profile'}
        onPress={() => navigation.navigate('Profile')}
      >
        <Octicons
          name="person"
          size={28}
          color="#FFF"
        />
      </TabButton>
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
    height: 44,

    marginHorizontal: 12,

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