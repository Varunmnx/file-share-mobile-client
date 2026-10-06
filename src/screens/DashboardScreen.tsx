import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { transfersApi } from '../api/transfers';
import { usageApi } from '../api/usage';
import type { Transfer, Usage } from '../types';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { Button } from '../components/Button';
import {
  formatBytes,
  formatDateTime,
  formatTimeRemaining,
  getFileIcon,
} from '../utils/formatters';

interface DashboardScreenProps {
  onNavigateUpload: (mode?: 'file' | 'folder') => void;
  onNavigateReceive: () => void;
  onNavigatePlans: () => void;
  onSelectTransfer: (transfer: Transfer) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateUpload,
  onNavigateReceive,
  onNavigatePlans,
  onSelectTransfer,
}) => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [transfersRes, usageRes] = await Promise.allSettled([
        transfersApi.listTransfers(),
        usageApi.getUsage(),
      ]);

      if (transfersRes.status === 'fulfilled') {
        setTransfers(transfersRes.value);
      }
      if (usageRes.status === 'fulfilled') {
        setUsage(usageRes.value);
      }
    } catch {
      // Handled by allSettled
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Transfer',
      `Are you sure you want to delete "${name}"? The recipient link will stop working immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await transfersApi.deleteTransfer(id);
              setTransfers((prev) => prev.filter((t) => t.id !== id));
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete transfer');
            }
          },
        },
      ]
    );
  };

  const handleShare = (transfer: Transfer) => {
    if (!transfer.share_url) {
      Alert.alert('Notice', 'Share link is not available for this transfer.');
      return;
    }
    Share.share({
      title: `FileDrop: ${transfer.filename}`,
      message: `Download "${transfer.filename}" securely via FileDrop: ${transfer.share_url}`,
      url: transfer.share_url,
    }).catch(() => {});
  };

  const renderHeader = () => {
    const storagePercent = usage
      ? Math.round((usage.active_storage_bytes / usage.max_storage_bytes) * 100)
      : 0;
    const transferPercent = usage
      ? Math.round((usage.active_transfer_count / usage.max_transfers) * 100)
      : 0;

    return (
      <View style={styles.headerSection}>
        {/* Usage Card */}
        <Card variant="elevated" style={styles.usageCard}>
          <View style={styles.usageHeader}>
            <View>
              <Text style={styles.usageTitle}>Storage & Quota</Text>
              <Text style={styles.usageSubtitle}>
                Plan: {user?.plan.toUpperCase()} • Max file: {user?.plan === 'pro' ? '1 GB' : '20 MB'}
              </Text>
            </View>
            {user?.plan !== 'pro' && (
              <Button
                title="Upgrade ⚡"
                size="sm"
                variant="outline"
                onPress={onNavigatePlans}
              />
            )}
          </View>

          <ProgressBar
            label="Active Transfers"
            percent={transferPercent}
            loadedBytes={usage?.active_transfer_count}
            totalBytes={usage?.max_transfers}
            color={transferPercent > 80 ? colors.danger : colors.primary}
          />

          <ProgressBar
            label="Storage Used"
            percent={storagePercent}
            loadedBytes={usage?.active_storage_bytes}
            totalBytes={usage?.max_storage_bytes}
            color={storagePercent > 80 ? colors.warning : colors.secondary}
          />
        </Card>

        {/* Quick Action Buttons */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.actionTile, styles.uploadTile]}
            onPress={() => onNavigateUpload('file')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionTitle}>Share File</Text>
            <Text style={styles.actionDesc}>Pick any document, image, or video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionTile, styles.folderTile]}
            onPress={() => onNavigateUpload('folder')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>📁</Text>
            <Text style={styles.actionTitle}>Share Folder</Text>
            <Text style={styles.actionDesc}>Auto-zips multiple files & folders</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.receiveBanner}
          onPress={onNavigateReceive}
          activeOpacity={0.8}
        >
          <View style={styles.receiveRow}>
            <Text style={styles.receiveIcon}>📥</Text>
            <View style={styles.receiveTextCol}>
              <Text style={styles.receiveTitle}>Receive / Download File</Text>
              <Text style={styles.receiveDesc}>Have a link or token from someone? Claim it here</Text>
            </View>
            <Text style={styles.receiveArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* List Title */}
        <View style={styles.transfersTitleRow}>
          <Text style={styles.transfersTitle}>Your Active Transfers</Text>
          <Text style={styles.transfersCount}>({transfers.length})</Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📂</Text>
        <Text style={styles.emptyTitle}>No transfers yet</Text>
        <Text style={styles.emptyDesc}>
          Upload a file or folder above to generate your first temporary one-time share link.
        </Text>
      </View>
    );
  };

  const renderTransferItem = ({ item }: { item: Transfer }) => {
    const isReady = item.status === 'READY';
    const isConsumed = item.status === 'CONSUMED';
    const isExpired = item.status === 'EXPIRED';

    return (
      <Card style={styles.transferCard}>
        <TouchableOpacity
          onPress={() => onSelectTransfer(item)}
          activeOpacity={0.7}
        >
          <View style={styles.transferTopRow}>
            <View style={styles.fileIconWrapper}>
              <Text style={styles.fileIcon}>
                {getFileIcon(item.filename, item.mime_type)}
              </Text>
            </View>

            <View style={styles.fileMetaCol}>
              <Text style={styles.filename} numberOfLines={1}>
                {item.filename}
              </Text>
              <Text style={styles.fileSubtext}>
                {formatBytes(item.actual_size_bytes || item.declared_size_bytes)} •{' '}
                {formatDateTime(item.created_at)}
              </Text>
            </View>

            <StatusBadge status={item.status} />
          </View>

          {/* Time Remaining pill if active */}
          {isReady && (
            <View style={styles.expiryRow}>
              <Text style={styles.expiryIcon}>⏳</Text>
              <Text style={styles.expiryText}>
                {formatTimeRemaining(item.expires_at)}
              </Text>
              {item.password_hash ? (
                <View style={styles.pwBadge}>
                  <Text style={styles.pwText}>🔒 Password Protected</Text>
                </View>
              ) : null}
            </View>
          )}

          {isConsumed && (
            <View style={styles.burnedRow}>
              <Text style={styles.burnedText}>
                🔥 One-time download completed — Link atomically burned.
              </Text>
            </View>
          )}

          {isExpired && (
            <View style={styles.burnedRow}>
              <Text style={styles.burnedText}>
                ⌛ Expired after retention TTL.
              </Text>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.cardActionsRow}>
            {isReady && item.share_url && (
              <Button
                title="Share"
                size="sm"
                icon="📤"
                variant="primary"
                onPress={() => handleShare(item)}
                style={styles.cardBtn}
              />
            )}
            <Button
              title="Details"
              size="sm"
              variant="secondary"
              onPress={() => onSelectTransfer(item)}
              style={styles.cardBtn}
            />
            <Button
              title="Delete"
              size="sm"
              variant="ghost"
              onPress={() => handleDelete(item.id, item.filename)}
              textStyle={{ color: colors.danger }}
            />
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={transfers}
        keyExtractor={(item) => item.id}
        renderItem={renderTransferItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 10,
  },
  usageCard: {
    marginBottom: 16,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  usageSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  actionTile: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  uploadTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    marginRight: 8,
  },
  folderTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    marginLeft: 8,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  actionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  receiveBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  receiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiveIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  receiveTextCol: {
    flex: 1,
  },
  receiveTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  receiveDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  receiveArrow: {
    color: colors.secondary,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  transfersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  transfersTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  transfersCount: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 6,
    fontWeight: '600',
  },
  transferCard: {
    marginBottom: 12,
    padding: 14,
  },
  transferTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fileIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileIcon: {
    fontSize: 22,
  },
  fileMetaCol: {
    flex: 1,
    marginRight: 8,
  },
  filename: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  fileSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  expiryIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  expiryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  pwBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pwText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '600',
  },
  burnedRow: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  burnedText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  cardBtn: {
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
});
