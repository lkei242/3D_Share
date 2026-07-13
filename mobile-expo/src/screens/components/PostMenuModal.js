import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const POPOVER_WIDTH = 220;
const MARGIN = 10; 

const MENU_ITEMS_OTHER = [
  { key: 'mute',   label: 'Silenciar usuario',  icon: 'volume-mute-outline',    color: null, bold: false },
  { key: 'report', label: 'Denunciar publicación', icon: 'flag-outline',         color: '#E74C3C', bold: false },
  { key: 'block',  label: 'Bloquear usuario',   icon: 'ban-outline',            color: '#E74C3C', bold: true },
];

const MENU_ITEMS_OWN = [
  { key: 'delete',  label: 'Eliminar',      icon: 'trash-outline',              color: '#E74C3C', bold: true  },
  { key: 'edit',    label: 'Editar',        icon: 'create-outline',             color: null,      bold: false },
  { key: 'promote', label: 'Promocionar',   icon: 'rocket-outline',             color: '#9DBD3F', bold: false },
  { key: 'reportData', label: 'Info sobre este post', icon: 'information-circle-outline', color: null, bold: false },
];

const ITEM_HEIGHT = 48;
const ARROW_SIZE = 8;


export default function PostMenuModal({ visible, onClose, isOwnPost, isMuted, isBlocked, reportLabel, onOptionPress, anchorPosition }) {
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';

  const muteItem = isMuted
    ? { key: 'unmute', label: 'Dejar de silenciar', icon: 'volume-high-outline', color: null, bold: false }
    : { key: 'mute',   label: 'Silenciar usuario',  icon: 'volume-mute-outline',    color: null, bold: false };

  const reportItem = { key: 'report', label: reportLabel || 'Denunciar publicación', icon: 'flag-outline', color: '#E74C3C', bold: false };

  const blockItem = isBlocked
    ? { key: 'unblock', label: 'Desbloquear usuario', icon: 'lock-open-outline',    color: null, bold: false }
    : { key: 'block',   label: 'Bloquear usuario',   icon: 'ban-outline',           color: '#E74C3C', bold: true };

  const items = isOwnPost ? MENU_ITEMS_OWN : [muteItem, reportItem, blockItem];

  const scaleAnim   = React.useRef(new Animated.Value(0.85)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 130,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 130,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  
  const anchor = anchorPosition || { x: SCREEN_W - 50, y: 60, width: 30, height: 30 };

  
  const popoverH = items.length * ITEM_HEIGHT + 2; 
  const spaceBelow = SCREEN_H - (anchor.y + anchor.height);
  const showAbove  = spaceBelow < popoverH + MARGIN + ARROW_SIZE + 20;

  
  let popoverLeft = anchor.x + anchor.width - POPOVER_WIDTH + 20;
  if (popoverLeft < MARGIN) popoverLeft = MARGIN;
  if (popoverLeft + POPOVER_WIDTH > SCREEN_W - MARGIN) popoverLeft = SCREEN_W - MARGIN - POPOVER_WIDTH;

  const popoverTop = showAbove
    ? anchor.y - popoverH - ARROW_SIZE - 4
    : anchor.y + anchor.height + ARROW_SIZE + 20;

  
  const arrowLeft = Math.min(
    Math.max(anchor.x + anchor.width / 2 - popoverLeft - ARROW_SIZE, 10),
    POPOVER_WIDTH - ARROW_SIZE * 2 - 10,
  );

  
  const popoverBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const dividerC  = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)';
  const shadowC   = isDark ? '#000' : '#555';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.popover,
                {
                  top: popoverTop,
                  left: popoverLeft,
                  width: POPOVER_WIDTH,
                  backgroundColor: popoverBg,
                  opacity: opacityAnim,
                  transform: [
                    {
                      scale: scaleAnim,
                    },
                    {
                      
                      translateX: scaleAnim.interpolate({
                        inputRange: [0.85, 1],
                        outputRange: [POPOVER_WIDTH * 0.075, 0],
                      }),
                    },
                    {
                      translateY: showAbove
                        ? scaleAnim.interpolate({ inputRange: [0.85, 1], outputRange: [popoverH * 0.075, 0] })
                        : scaleAnim.interpolate({ inputRange: [0.85, 1], outputRange: [-popoverH * 0.075, 0] }),
                    },
                  ],
                  shadowColor: shadowC,
                },
              ]}
            >
              {}
              {showAbove ? (
                <View style={[styles.arrowDown, { left: arrowLeft, borderTopColor: popoverBg }]} />
              ) : (
                <View style={[styles.arrowUp, { left: arrowLeft, borderBottomColor: popoverBg }]} />
              )}

              {}
              {items.map((item, index) => (
                <React.Fragment key={item.key}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    activeOpacity={0.55}
                    onPress={() => {
                      onClose();
                      setTimeout(() => onOptionPress(item.key), 150);
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={19}
                      color={item.color || (isDark ? '#8E8E93' : '#8E8E93')}
                      style={styles.menuIcon}
                    />
                    <Text
                      style={[
                        styles.menuLabel,
                        {
                          color: item.color || colors.text,
                          fontWeight: item.bold ? '600' : '400',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                  {index < items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: dividerC }]} />
                  )}
                </React.Fragment>
              ))}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  popover: {
    position: 'absolute',
    borderRadius: 13,
    overflow: 'visible',
    
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  arrowUp: {
    position: 'absolute',
    top: -ARROW_SIZE,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowDown: {
    position: 'absolute',
    bottom: -ARROW_SIZE,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 14,
    height: ITEM_HEIGHT,
    gap: 10,
  },
  menuIcon: {
    width: 22,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: 14.5,
    fontFamily: 'Nunito-Regular',
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
});