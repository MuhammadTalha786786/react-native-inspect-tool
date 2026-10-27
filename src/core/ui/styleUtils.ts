import { StyleSheet } from 'react-native';

export const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  cyan: '#00ffff',
  yellow: '#ffff00',
  magenta: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080',
  gray: '#808080',
  grey: '#808080',
  lightgray: '#d3d3d3',
  darkgray: '#a9a9a9',
  pink: '#ffc0cb',
  teal: '#008080',
  navy: '#000080',
  indigo: '#4b0082',
  transparent: 'transparent',
};

export function isValidColor(val: any): boolean {
  if (typeof val !== 'string') return false;
  const s = val.trim().toLowerCase();
  if (!s) return false;
  if (s === 'transparent') return true;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return true;
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/i.test(s)) return true;
  if (/^hsla?\(/i.test(s)) return true;
  return Boolean(NAMED_COLORS[s]);
}

/**
 * Safely extracts a primitive or safe value from any style value,
 * extracting Reanimated SharedValues and Animated.Values using `_value`
 * to strictly prevent triggering Reanimated's inline style getter warning.
 */
export function extractSafeStyleValue(val: any): any {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string') {
    return val;
  }
  if (typeof val === 'object') {
    // Reanimated SharedValue or Animated.Value: read internal `_value` directly
    if ('_value' in val) {
      return (val as any)._value;
    }
    if ((val as any)._isReanimatedSharedValue) {
      return (val as any)._value;
    }
    if (Array.isArray(val)) {
      return val.map((item) => {
        if (typeof item === 'object' && item !== null) {
          const inner: Record<string, any> = {};
          for (const [k, v] of Object.entries(item)) {
            inner[k] = extractSafeStyleValue(v);
          }
          return inner;
        }
        return item;
      });
    }
  }
  return val;
}

/**
 * Sanitizes an entire style object, flattening it and replacing
 * any Reanimated SharedValue with its raw primitive value.
 */
export function sanitizeComponentStyle(rawStyle: any): Record<string, any> {
  if (!rawStyle || typeof rawStyle !== 'object') return {};
  let flattened: Record<string, any> = {};
  try {
    flattened = StyleSheet.flatten(rawStyle) || {};
  } catch {
    return {};
  }

  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(flattened)) {
    if (val === null || val === undefined) continue;
    cleaned[key] = extractSafeStyleValue(val);
  }

  return cleaned;
}

/**
 * Formats a value for display in the inspector table safely.
 */
export function safeFormatValue(val: any): string {
  const safe = extractSafeStyleValue(val);
  if (safe === null || safe === undefined) return '';
  if (typeof safe === 'number' || typeof safe === 'boolean') return String(safe);
  if (typeof safe === 'string') return safe;
  if (typeof safe === 'object') {
    try {
      return JSON.stringify(safe);
    } catch {
      return '[Object]';
    }
  }
  return String(safe);
}
