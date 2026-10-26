import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ConsoleLog, LogLevel } from '../../types';
import { colors } from '../theme';
import { SearchBar } from '../components/SearchBar';
import { JsonViewer } from '../components/JsonViewer';

interface ConsoleTabProps {
  logs: ConsoleLog[];
}

export const ConsoleTab: React.FC<ConsoleTabProps> = ({ logs }) => {
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const filterChips = [
    { id: 'ALL', label: 'All' },
    { id: 'ERROR', label: 'Errors' },
    { id: 'WARN', label: 'Warnings' },
    { id: 'LOG', label: 'Logs & Info' },
  ];

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Query filter
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchMsg = log.message.toLowerCase().includes(q);
        const matchStack = log.stack?.toLowerCase().includes(q);
        if (!matchMsg && !matchStack) return false;
      }

      // Level filter
      if (levelFilter === 'ERROR') return log.level === 'error';
      if (levelFilter === 'WARN') return log.level === 'warn';
      if (levelFilter === 'LOG') return log.level === 'log' || log.level === 'info';

      return true;
    });
  }, [logs, query, levelFilter]);

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItem = ({ item }: { item: ConsoleLog }) => {
    const isExpanded = expandedLogIds.has(item.id);
    const timeStr = new Date(item.timestamp).toLocaleTimeString();

    let borderLeftColor = colors.log.log;
    let badgeBg = colors.cardSecondary;
    let badgeText = item.level.toUpperCase();

    if (item.level === 'error') {
      borderLeftColor = colors.log.error;
      badgeBg = colors.error;
    } else if (item.level === 'warn') {
      borderLeftColor = colors.log.warn;
      badgeBg = colors.warning;
    } else if (item.level === 'info') {
      borderLeftColor = colors.log.info;
      badgeBg = colors.info;
    }

    const hasExtraDetails = Boolean(
      item.stack ||
      item.componentStack ||
      (item.args && item.args.some((arg) => typeof arg === 'object' && arg !== null))
    );

    return (
      <View style={[styles.logCard, { borderLeftColor }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => hasExtraDetails && toggleExpand(item.id)}
          style={styles.cardHeader}
        >
          <View style={styles.badgeRow}>
            <View style={[styles.levelBadge, { backgroundColor: badgeBg }]}>
              <Text style={styles.levelBadgeText}>{badgeText}</Text>
            </View>
            {item.isUnhandled && (
              <View style={[styles.levelBadge, { backgroundColor: '#7f1d1d' }]}>
                <Text style={styles.levelBadgeText}>CRASH</Text>
              </View>
            )}
            <Text style={styles.timestampText}>{timeStr}</Text>
          </View>

          <Text style={[styles.messageText, item.level === 'error' && styles.errorMessageText]}>
            {item.message}
          </Text>

          {hasExtraDetails && (
            <View style={styles.expandPrompt}>
              <Text style={styles.expandPromptText}>
                {isExpanded ? '▲ Hide Call Stack & Arguments' : '▼ View Call Stack & Arguments'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {item.stack && (
              <View style={styles.stackSection}>
                <Text style={styles.sectionHeading}>Call Stack</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.stackText} selectable>
                    {item.stack}
                  </Text>
                </View>
              </View>
            )}

            {item.componentStack && (
              <View style={styles.stackSection}>
                <Text style={styles.sectionHeading}>Component Hierarchy</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.stackText} selectable>
                    {item.componentStack}
                  </Text>
                </View>
              </View>
            )}

            {item.args && item.args.length > 0 && (
              <View style={styles.stackSection}>
                <Text style={styles.sectionHeading}>Arguments / Payload</Text>
                {item.args.map((arg, idx) => (
                  <JsonViewer key={idx} data={arg} title={`Argument #${idx + 1}`} maxHeight={200} />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SearchBar
        query={query}
        onChangeQuery={setQuery}
        placeholder="Search logs or stack traces..."
        filters={filterChips}
        selectedFilter={levelFilter}
        onSelectFilter={setLevelFilter}
      />

      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚨</Text>
            <Text style={styles.emptyTitle}>No Logs Recorded</Text>
            <Text style={styles.emptySubtitle}>
              {logs.length === 0
                ? 'Console output and exceptions (console.log, console.error, unhandled errors) will appear here.'
                : 'No logs match your filter criteria.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingBottom: 20,
  },
  logCard: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 4,
    padding: 10,
  },
  cardHeader: {
    flexDirection: 'column',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  levelBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Courier',
  },
  timestampText: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  messageText: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Courier',
    lineHeight: 18,
  },
  errorMessageText: {
    color: colors.log.error,
    fontWeight: '600',
  },
  expandPrompt: {
    marginTop: 6,
  },
  expandPromptText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stackSection: {
    marginTop: 6,
  },
  sectionHeading: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  codeBox: {
    backgroundColor: '#121214',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stackText: {
    color: '#e2e8f0',
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
});
