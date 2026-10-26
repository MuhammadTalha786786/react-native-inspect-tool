import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { colors } from '../theme';

interface FloatingBubbleProps {
  onPress: () => void;
  errorCount: number;
  networkErrorCount: number;
  currentFPS?: number;
  initialPosition?: { x: number; y: number };
}

export const FloatingBubble: React.FC<FloatingBubbleProps> = ({
  onPress,
  errorCount,
  networkErrorCount,
  currentFPS,
  initialPosition,
}) => {
  const startX = typeof initialPosition?.x === 'number' ? initialPosition.x : 20;
  const startY = typeof initialPosition?.y === 'number' ? initialPosition.y : 150;

  const pan = useRef(new Animated.ValueXY({ x: startX, y: startY })).current;
  const currentPos = useRef({ x: startX, y: startY });
  const isDragging = useRef(false);

  useEffect(() => {
    const listenerId = pan.addListener((value) => {
      currentPos.current = value;
    });
    return () => {
      pan.removeListener(listenerId);
    };
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        isDragging.current = true;
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const { width, height } = Dimensions.get('window');

        let targetX = currentPos.current.x;
        let targetY = currentPos.current.y;

        targetX = Math.max(10, Math.min(width - 66, targetX));
        targetY = Math.max(40, Math.min(height - 110, targetY));

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          friction: 6,
        }).start();

        setTimeout(() => {
          isDragging.current = false;
        }, 120);
      },
    })
  ).current;

  const handlePress = () => {
    if (!isDragging.current) {
      onPress();
    }
  };

  const totalBadges = errorCount + networkErrorCount;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={styles.bubble}
      >
        <Text style={styles.bubbleIcon}>⚡</Text>
        {currentFPS !== undefined && (
          <Text style={styles.fpsText}>{currentFPS} fps</Text>
        )}

        {totalBadges > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {totalBadges > 99 ? '99+' : totalBadges}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999999,
    elevation: 999999,
    width: 60,
    height: 60,
  },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e1b4b',
    borderWidth: 2.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 25,
  },
  bubbleIcon: {
    fontSize: 22,
  },
  fpsText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    marginTop: -2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#18181b',
    elevation: 30,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
});
