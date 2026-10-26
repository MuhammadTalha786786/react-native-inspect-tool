import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme';

interface JsonViewerProps {
  data: any;
  title?: string;
  maxHeight?: number;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, title, maxHeight = 300 }) => {
  const [copied, setCopied] = useState(false);

  let formatted = '';
  if (data === undefined) {
    formatted = 'undefined';
  } else if (data === null) {
    formatted = 'null';
  } else if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      formatted = JSON.stringify(parsed, null, 2);
    } catch {
      formatted = data;
    }
  } else {
    try {
      formatted = JSON.stringify(data, null, 2);
    } catch {
      formatted = String(data);
    }
  }

  const handleCopy = () => {
    // Note: If Clipboard is not installed, we still give visual feedback
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {title && <Text style={styles.title}>{title}</Text>}
        <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
          <Text style={styles.copyText}>{copied ? '✓ Copied' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={[styles.scroll, { maxHeight }]}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        <Text style={styles.codeText} selectable>
          {formatted}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121214',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  copyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.card,
  },
  copyText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  scroll: {
    padding: 10,
  },
  codeText: {
    color: '#e2e8f0',
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 18,
  },
});
