import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface BadgeProps {
  label: string | number;
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  color = colors.text,
  backgroundColor = colors.cardSecondary,
  size = 'md',
}) => {
  const isSm = size === 'sm';
  return (
    <View style={[styles.badge, { backgroundColor }, isSm && styles.badgeSm]}>
      <Text style={[styles.text, { color }, isSm && styles.textSm]}>
        {label}
      </Text>
    </View>
  );
};

export const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const upper = (method || 'GET').toUpperCase();
  const bg = (colors.method as any)[upper] || colors.method.DEFAULT;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, styles.methodText]}>{upper}</Text>
    </View>
  );
};

export const StatusBadge: React.FC<{ status: number; isPending?: boolean }> = ({ status, isPending }) => {
  if (isPending) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.warning }]}>
        <Text style={[styles.text, styles.statusText]}>PENDING</Text>
      </View>
    );
  }

  let bg = colors.error;
  if (status >= 200 && status < 300) {
    bg = colors.success;
  } else if (status >= 300 && status < 400) {
    bg = colors.info;
  } else if (status >= 400 && status < 500) {
    bg = colors.warning;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, styles.statusText]}>{status || 'ERR'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Courier',
  },
  textSm: {
    fontSize: 10,
  },
  methodText: {
    color: '#ffffff',
    fontSize: 11,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
  },
});
