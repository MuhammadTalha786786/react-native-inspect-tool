import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../theme';
import { DevLens } from '../../core/DevLensCore';

interface AppInfoTabProps {
  onClearAll: () => void;
}

export const AppInfoTab: React.FC<AppInfoTabProps> = ({ onClearAll }) => {
  const window = Dimensions.get('window');
  const screen = Dimensions.get('screen');

  const triggerTestGet = () => {
    fetch('https://jsonplaceholder.typicode.com/todos/1').catch(() => {});
  };

  const triggerTestPost = () => {
    fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'inspectToolRN Test', body: 'Inspecting React Native!', userId: 1 }),
    }).catch(() => {});
  };

  const triggerTest404 = () => {
    fetch('https://jsonplaceholder.typicode.com/nonexistent-endpoint-404').catch(() => {});
  };

  const triggerTestLog = () => {
    console.log('⚡ [inspectToolRN Info]', 'Testing regular log message with data', { status: 'healthy', timestamp: Date.now() });
    console.warn('⚠️ [inspectToolRN Warning]', 'Testing warning log message');
    console.error('🛑 [inspectToolRN Error]', new Error('Demonstration error stack trace for inspectToolRN inspector'));
  };

  const triggerTimerSimulation = () => {
    let count = 0;
    const testInterval = setInterval(() => {
      count++;
      if (count >= 15) {
        clearInterval(testInterval);
      }
    }, 1000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Device & Environment Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Environment Details</Text>
        <View style={styles.grid}>
          <View style={styles.row}>
            <Text style={styles.key}>Platform / OS:</Text>
            <Text style={styles.val}>{Platform.OS} (v{Platform.Version})</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Hermes Engine:</Text>
            <Text style={styles.val}>
              {Boolean((global as any).HermesInternal) ? 'Enabled (Hermes)' : 'Disabled (JSC)'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Dev Mode (__DEV__):</Text>
            <Text style={styles.val}>{String(__DEV__)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Window Size:</Text>
            <Text style={styles.val}>
              {Math.round(window.width)} x {Math.round(window.height)} (scale: {window.scale})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Screen Size:</Text>
            <Text style={styles.val}>
              {Math.round(screen.width)} x {Math.round(screen.height)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>inspectToolRN Version:</Text>
            <Text style={styles.val}>1.0.2</Text>
          </View>
        </View>
      </View>

      {/* Test / Simulation Tools */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Test Actions</Text>
        <Text style={styles.cardDesc}>
          Tap these actions to immediately test inspectToolRN interception capabilities.
        </Text>

        <View style={styles.btnRow}>
          <TouchableOpacity onPress={triggerTestGet} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>🌐 Send GET API</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={triggerTestPost} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>📤 Send POST API</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity onPress={triggerTest404} style={[styles.actionBtn, styles.actionBtnWarn]}>
            <Text style={styles.actionBtnText}>🚨 Trigger 404 API</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={triggerTestLog} style={[styles.actionBtn, styles.actionBtnWarn]}>
            <Text style={styles.actionBtnText}>📝 Trigger Logs</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={triggerTimerSimulation} style={styles.wideBtn}>
          <Text style={styles.actionBtnText}>⏱️ Start Sample 15s Interval</Text>
        </TouchableOpacity>
      </View>

      {/* Reset Data */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Maintenance</Text>
        <TouchableOpacity onPress={onClearAll} style={styles.dangerBtn}>
          <Text style={styles.dangerBtnText}>🗑️ Clear All inspectToolRN Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 12,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  key: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Courier',
  },
  val: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Courier',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionBtnWarn: {
    borderColor: '#78350f',
  },
  wideBtn: {
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  dangerBtn: {
    backgroundColor: '#450a0a',
    borderColor: colors.error,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
