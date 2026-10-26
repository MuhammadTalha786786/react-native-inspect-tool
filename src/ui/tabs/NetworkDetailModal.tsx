import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NetworkRequest } from '../../types';
import { NetworkStorage } from '../../core/network/NetworkStorage';
import { colors } from '../theme';
import { MethodBadge, StatusBadge } from '../components/Badge';
import { JsonViewer } from '../components/JsonViewer';

interface NetworkDetailModalProps {
  request: NetworkRequest | null;
  visible: boolean;
  onClose: () => void;
}

type DetailSubTab = 'overview' | 'headers' | 'payload' | 'response';

export const NetworkDetailModal: React.FC<NetworkDetailModalProps> = ({
  request,
  visible,
  onClose,
}) => {
  const [subTab, setSubTab] = useState<DetailSubTab>('overview');
  const [copiedCurl, setCopiedCurl] = useState(false);

  if (!request) return null;

  const handleCopyCurl = () => {
    const curl = NetworkStorage.toCurl(request);
    // Visual feedback
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MethodBadge method={request.method} />
              <StatusBadge status={request.status} isPending={request.isPending} />
              <Text style={styles.durationText}>
                {request.duration !== undefined ? `${request.duration}ms` : 'pending'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* URL bar */}
          <View style={styles.urlBar}>
            <Text style={styles.urlText} numberOfLines={3} selectable>
              {request.url}
            </Text>
          </View>

          {/* Sub-tabs bar */}
          <View style={styles.subTabsRow}>
            {(['overview', 'headers', 'payload', 'response'] as DetailSubTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setSubTab(tab)}
                style={[styles.subTabItem, subTab === tab && styles.subTabItemActive]}
              >
                <Text style={[styles.subTabText, subTab === tab && styles.subTabTextActive]}>
                  {tab.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          <ScrollView style={styles.content}>
            {subTab === 'overview' && (
              <View style={styles.tabContent}>
                <TouchableOpacity onPress={handleCopyCurl} style={styles.curlBtn}>
                  <Text style={styles.curlBtnText}>
                    {copiedCurl ? '✓ cURL Copied to Clipboard' : '📋 Copy as cURL'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>General Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Request URL:</Text>
                    <Text style={styles.infoVal} selectable>{request.url}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Request Method:</Text>
                    <Text style={styles.infoVal}>{request.method}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Status Code:</Text>
                    <Text style={styles.infoVal}>
                      {request.status} {request.statusText || ''}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Duration:</Text>
                    <Text style={styles.infoVal}>
                      {request.duration !== undefined ? `${request.duration} ms` : 'In progress'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Response Size:</Text>
                    <Text style={styles.infoVal}>
                      {request.size !== undefined ? `${(request.size / 1024).toFixed(2)} KB (${request.size} bytes)` : 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Start Time:</Text>
                    <Text style={styles.infoVal}>{new Date(request.startTime).toLocaleTimeString()}</Text>
                  </View>
                  {request.error && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoKey, { color: colors.error }]}>Error:</Text>
                      <Text style={[styles.infoVal, { color: colors.error }]}>{request.error}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {subTab === 'headers' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionTitle}>Request Headers</Text>
                {request.requestHeaders && Object.keys(request.requestHeaders).length > 0 ? (
                  <View style={styles.sectionCard}>
                    {Object.entries(request.requestHeaders).map(([k, v]) => (
                      <View key={k} style={styles.infoRow}>
                        <Text style={styles.infoKey}>{k}:</Text>
                        <Text style={styles.infoVal} selectable>{v}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No request headers recorded</Text>
                )}

                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Response Headers</Text>
                {request.responseHeaders && Object.keys(request.responseHeaders).length > 0 ? (
                  <View style={styles.sectionCard}>
                    {Object.entries(request.responseHeaders).map(([k, v]) => (
                      <View key={k} style={styles.infoRow}>
                        <Text style={styles.infoKey}>{k}:</Text>
                        <Text style={styles.infoVal} selectable>{v}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No response headers recorded</Text>
                )}
              </View>
            )}

            {subTab === 'payload' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionTitle}>Request Payload</Text>
                {request.requestBody !== undefined ? (
                  <JsonViewer data={request.requestBody} title="Request Body" maxHeight={400} />
                ) : (
                  <Text style={styles.emptyText}>No payload / body sent with request</Text>
                )}
              </View>
            )}

            {subTab === 'response' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionTitle}>Response Data</Text>
                {request.responseBody !== undefined ? (
                  <JsonViewer data={request.responseBody} title="Response Body" maxHeight={450} />
                ) : (
                  <Text style={styles.emptyText}>No response body available</Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Courier',
  },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.cardSecondary,
  },
  closeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  urlBar: {
    padding: 12,
    backgroundColor: colors.cardSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  urlText: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Courier',
    lineHeight: 16,
  },
  subTabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabItemActive: {
    borderBottomColor: colors.primary,
  },
  subTabText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  subTabTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  tabContent: {
    paddingBottom: 40,
  },
  curlBtn: {
    backgroundColor: '#312e81',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 14,
  },
  curlBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'column',
    gap: 2,
  },
  infoKey: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Courier',
  },
  infoVal: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Courier',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginVertical: 8,
  },
});
