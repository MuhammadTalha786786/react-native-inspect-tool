import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { TabType } from '../../types';
import { colors } from '../theme';

interface HeaderProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onClear: () => void;
  onClose: () => void;
  onStartTouchInspect?: () => void;
  networkErrorCount: number;
  consoleErrorCount: number;
  leakAlertCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onClear,
  onClose,
  onStartTouchInspect,
  networkErrorCount,
  consoleErrorCount,
  leakAlertCount,
}) => {
  const tabs: { id: TabType; label: string; badge?: number; badgeColor?: string }[] = [
    {
      id: 'network',
      label: 'Network',
      badge: networkErrorCount > 0 ? networkErrorCount : undefined,
      badgeColor: colors.error,
    },
    {
      id: 'console',
      label: 'Console',
      badge: consoleErrorCount > 0 ? consoleErrorCount : undefined,
      badgeColor: colors.error,
    },
    {
      id: 'memory',
      label: 'Memory',
      badge: leakAlertCount > 0 ? leakAlertCount : undefined,
      badgeColor: colors.warning,
    },
    {
      id: 'elements',
      label: 'Elements',
    },
    {
      id: 'info',
      label: 'Info',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandLogo}>⚡</Text>
          <Text style={styles.brandTitle}>DevLens</Text>
          <Text style={styles.brandSub}>INSPECTOR</Text>
        </View>
        <View style={styles.actions}>
          {onStartTouchInspect && (
            <TouchableOpacity
              onPress={onStartTouchInspect}
              style={[styles.iconBtn, { backgroundColor: '#1e1b4b', borderColor: colors.primary, borderWidth: 1 }]}
              accessibilityLabel="Touch Inspect Element"
            >
              <Text style={styles.actionIcon}>🎯</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClear} style={styles.iconBtn} accessibilityLabel="Clear">
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onSelectTab(tab.id)}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.badge !== undefined && (
                <View style={[styles.tabBadge, { backgroundColor: tab.badgeColor || colors.error }]}>
                  <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandLogo: {
    fontSize: 16,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSub: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#312e81',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  actionIcon: {
    fontSize: 14,
  },
  closeBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  closeIcon: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 4,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 16,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
