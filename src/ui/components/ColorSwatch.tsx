import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme';
import { ElementColorInfo } from '../../types';
import { isValidColor } from '../../core/ui/styleUtils';

interface ColorSwatchProps {
  colorInfo: ElementColorInfo;
}

export const ColorSwatch: React.FC<ColorSwatchProps> = ({ colorInfo }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const readableType = {
    backgroundColor: 'Background',
    color: 'Text Color',
    borderColor: 'Border',
    shadowColor: 'Shadow',
    tintColor: 'Tint',
  }[colorInfo.type] || colorInfo.type;

  const validBg = isValidColor(colorInfo.value) && colorInfo.value !== 'transparent'
    ? colorInfo.value
    : 'transparent';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handleCopy}
      style={styles.container}
    >
      <View style={[styles.previewBlock, { backgroundColor: validBg }]} />
      <View style={styles.textContainer}>
        <Text style={styles.labelText}>{readableType}</Text>
        <Text style={styles.valueText} selectable>
          {colorInfo.value}
        </Text>
      </View>
      <Text style={styles.copyNotice}>{copied ? '✓ Copied' : 'Copy'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  previewBlock: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textContainer: {
    flex: 1,
  },
  labelText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  valueText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Courier',
    fontWeight: '600',
  },
  copyNotice: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
  },
});
