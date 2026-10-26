import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ActiveTimer, MemoryLeakAlert, MemorySample } from '../../types';
import { colors } from '../theme';

interface MemoryTabProps {
  currentSample: MemorySample | null;
  history: MemorySample[];
  alerts: MemoryLeakAlert[];
  activeTimers: ActiveTimer[];
  isHermes: boolean;
  onClearAlerts: () => void;
}

export const MemoryTab: React.FC<MemoryTabProps> = ({
  currentSample,
  history,
  alerts,
  activeTimers,
  isHermes,
  onClearAlerts,
}) => {
  const [selectedTimerId, setSelectedTimerId] = useState<string | number | null>(null);

  const jsHeap = currentSample?.jsHeapSizeMB || 0;
  const allocated = currentSample?.allocatedBytesMB || 0;
  const totalHeap = currentSample?.totalHeapMB || 0;
  const fps = currentSample?.fps || 60;
  const timerCount = activeTimers.length;

  let fpsColor = colors.success;
  if (fps < 30) fpsColor = colors.error;
  else if (fps < 50) fpsColor = colors.warning;

  // Compute sparkline min/max
  const maxHeapInHistory = Math.max(...history.map((h) => h.jsHeapSizeMB), jsHeap || 1);
  const minHeapInHistory = Math.min(...history.map((h) => h.jsHeapSizeMB), jsHeap || 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Engine Status Banner */}
      <View style={styles.engineBanner}>
        <View style={styles.engineLeft}>
          <Text style={styles.engineDot}>{isHermes ? '🟢' : '🟡'}</Text>
          <Text style={styles.engineTitle}>
            Engine: {isHermes ? 'Hermes JS Engine (Live Heap API Active)' : 'JSC / Standard Engine'}
          </Text>
        </View>
        <Text style={styles.engineBadge}>{isHermes ? 'HERMES' : 'DEFAULT'}</Text>
      </View>

      {/* Metric Cards Row */}
      <View style={styles.metricGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>JS Heap Size</Text>
          <Text style={styles.metricValue}>{jsHeap.toFixed(1)} <Text style={styles.metricUnit}>MB</Text></Text>
          <Text style={styles.metricSub}>Allocated: {allocated.toFixed(1)} MB</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Heap Limit</Text>
          <Text style={styles.metricValue}>{totalHeap > 0 ? totalHeap.toFixed(1) : '--'} <Text style={styles.metricUnit}>MB</Text></Text>
          <Text style={styles.metricSub}>Capacity</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>JS Thread FPS</Text>
          <Text style={[styles.metricValue, { color: fpsColor }]}>{fps}</Text>
          <Text style={styles.metricSub}>
            {fps >= 55 ? 'Smooth' : fps >= 40 ? 'Jank detected' : 'Lagging'}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active Timers</Text>
          <Text style={styles.metricValue}>{timerCount}</Text>
          <Text style={styles.metricSub}>Intervals & Timeouts</Text>
        </View>
      </View>

      {/* Heap Memory Trend Sparkline */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Heap Memory Trend (Last 60s)</Text>
          <Text style={styles.trendRange}>
            {minHeapInHistory.toFixed(1)} MB - {maxHeapInHistory.toFixed(1)} MB
          </Text>
        </View>

        <View style={styles.sparklineContainer}>
          {history.length > 0 ? (
            history.map((s, idx) => {
              const range = Math.max(1, maxHeapInHistory - minHeapInHistory);
              const pct = Math.max(0.1, (s.jsHeapSizeMB - minHeapInHistory) / range);
              const height = Math.round(pct * 60);

              return (
                <View key={idx} style={styles.sparkBarWrapper}>
                  <View style={[styles.sparkBar, { height }]} />
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>Collecting memory history samples...</Text>
          )}
        </View>
      </View>

      {/* Leak Alerts */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Memory Leak Detection ({alerts.length})
          </Text>
          {alerts.length > 0 && (
            <TouchableOpacity onPress={onClearAlerts} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Dismiss All</Text>
            </TouchableOpacity>
          )}
        </View>

        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.alertBox,
                alert.severity === 'critical' ? styles.alertCritical : styles.alertWarning,
              ]}
            >
              <View style={styles.alertHeader}>
                <Text style={styles.alertIcon}>
                  {alert.severity === 'critical' ? '🛑' : '⚠️'}
                </Text>
                <Text style={styles.alertTitle}>{alert.title}</Text>
              </View>
              <Text style={styles.alertDesc}>{alert.description}</Text>
            </View>
          ))
        ) : (
          <View style={styles.healthyBox}>
            <Text style={styles.healthyIcon}>✅</Text>
            <Text style={styles.healthyText}>
              No memory leak anomalies detected. Heap stability and timers are normal.
            </Text>
          </View>
        )}
      </View>

      {/* Active Timers List */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Active Timers & Intervals ({activeTimers.length})
        </Text>
        <Text style={styles.sectionSub}>
          Tracks active setInterval/setTimeout to detect unmounted leaks.
        </Text>

        {activeTimers.length > 0 ? (
          activeTimers.map((timer) => {
            const isSelected = selectedTimerId === timer.id;
            const elapsedSec = Math.round((Date.now() - timer.createdAt) / 1000);
            const isLongRunning = timer.type === 'interval' && elapsedSec > 30;

            return (
              <TouchableOpacity
                key={timer.id}
                style={[styles.timerRow, isLongRunning && styles.timerRowWarning]}
                onPress={() => setSelectedTimerId(isSelected ? null : timer.id)}
                activeOpacity={0.7}
              >
                <View style={styles.timerMain}>
                  <View style={styles.timerBadge}>
                    <Text style={styles.timerBadgeText}>
                      {timer.type.toUpperCase()} #{timer.id}
                    </Text>
                  </View>
                  <Text style={styles.timerInfo}>
                    Every {timer.delay}ms • {timer.callCount} ticks • {elapsedSec}s elapsed
                  </Text>
                </View>

                {isSelected && timer.stack && (
                  <View style={styles.timerStackBox}>
                    <Text style={styles.timerStackTitle}>Call Site Stack:</Text>
                    <Text style={styles.timerStackText}>{timer.stack}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No active intervals or lingering timers running.</Text>
        )}
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
  engineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  engineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  engineDot: {
    fontSize: 14,
  },
  engineTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  engineBadge: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Courier',
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 4,
    fontFamily: 'Courier',
  },
  metricUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  metricSub: {
    color: colors.textMuted,
    fontSize: 10,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 10,
  },
  trendRange: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'Courier',
  },
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 70,
    backgroundColor: '#121214',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  sparkBarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  sparkBar: {
    width: '100%',
    minHeight: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  alertBox: {
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  alertWarning: {
    backgroundColor: '#451a03',
    borderColor: colors.warning,
  },
  alertCritical: {
    backgroundColor: '#450a0a',
    borderColor: colors.error,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  alertIcon: {
    fontSize: 14,
  },
  alertTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  alertDesc: {
    color: '#fef08a',
    fontSize: 11,
    lineHeight: 16,
  },
  healthyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#052e16',
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },
  healthyIcon: {
    fontSize: 16,
  },
  healthyText: {
    color: '#bbf7d0',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.cardSecondary,
  },
  clearBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  timerRow: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerRowWarning: {
    borderColor: colors.warning,
  },
  timerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBadge: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timerBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Courier',
  },
  timerInfo: {
    color: colors.text,
    fontSize: 11,
    fontFamily: 'Courier',
    flex: 1,
  },
  timerStackBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timerStackTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  timerStackText: {
    color: colors.accent,
    fontSize: 10,
    fontFamily: 'Courier',
    lineHeight: 14,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginVertical: 4,
  },
});
