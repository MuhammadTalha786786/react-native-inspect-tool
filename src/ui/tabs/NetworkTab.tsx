import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { NetworkRequest } from '../../types';
import { colors } from '../theme';
import { MethodBadge, StatusBadge } from '../components/Badge';
import { SearchBar } from '../components/SearchBar';
import { NetworkDetailModal } from './NetworkDetailModal';

interface NetworkTabProps {
  requests: NetworkRequest[];
}

export const NetworkTab: React.FC<NetworkTabProps> = ({ requests }) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(null);

  const filterChips = [
    { id: 'ALL', label: 'All' },
    { id: '2XX', label: '2xx Success' },
    { id: '4XX', label: '4xx Client Err' },
    { id: '5XX', label: '5xx Server Err' },
    { id: 'PENDING', label: 'Pending' },
  ];

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Query filter
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchUrl = req.url.toLowerCase().includes(q);
        const matchMethod = req.method.toLowerCase().includes(q);
        if (!matchUrl && !matchMethod) return false;
      }

      // Status filter
      if (statusFilter === '2XX') {
        return req.status >= 200 && req.status < 300;
      }
      if (statusFilter === '4XX') {
        return req.status >= 400 && req.status < 500;
      }
      if (statusFilter === '5XX') {
        return req.status >= 500;
      }
      if (statusFilter === 'PENDING') {
        return req.isPending;
      }

      return true;
    });
  }, [requests, query, statusFilter]);

  const renderItem = ({ item }: { item: NetworkRequest }) => {
    let pathname = item.url;
    try {
      // Parse relative or clean path
      const urlObj = new URL(item.url);
      pathname = urlObj.pathname + (urlObj.search || '');
    } catch {
      // Keep full url
    }

    const timeStr = new Date(item.startTime).toLocaleTimeString();
    const durationStr = item.duration !== undefined ? `${item.duration}ms` : '...';
    const sizeStr = item.size ? `${(item.size / 1024).toFixed(1)}k` : '';

    return (
      <TouchableOpacity
        style={styles.itemRow}
        activeOpacity={0.7}
        onPress={() => setSelectedRequest(item)}
      >
        <View style={styles.badgeCol}>
          <MethodBadge method={item.method} />
          <StatusBadge status={item.status} isPending={item.isPending} />
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.pathText} numberOfLines={1}>
            {pathname}
          </Text>
          <Text style={styles.hostText} numberOfLines={1}>
            {item.url}
          </Text>
        </View>

        <View style={styles.metaCol}>
          <Text style={styles.durationText}>{durationStr}</Text>
          {sizeStr ? <Text style={styles.sizeText}>{sizeStr}</Text> : null}
          <Text style={styles.timeText}>{timeStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SearchBar
        query={query}
        onChangeQuery={setQuery}
        placeholder="Filter by URL or method..."
        filters={filterChips}
        selectedFilter={statusFilter}
        onSelectFilter={setStatusFilter}
      />

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🌐</Text>
            <Text style={styles.emptyTitle}>No Network Requests</Text>
            <Text style={styles.emptySubtitle}>
              {requests.length === 0
                ? 'API calls made via fetch() or axios will appear here automatically.'
                : 'No requests match the current search or status filter.'}
            </Text>
          </View>
        }
      />

      <NetworkDetailModal
        request={selectedRequest}
        visible={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  badgeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 104,
  },
  infoCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  pathText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Courier',
  },
  hostText: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  metaCol: {
    alignItems: 'flex-end',
    width: 65,
  },
  durationText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Courier',
  },
  sizeText: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  timeText: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 1,
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
