import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { colors } from '../theme/colors';
import { transfersApi } from '../api/transfers';
import type { Transfer } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import {
  formatBytes,
  formatDateTime,
  formatTimeRemaining,
  getFileIcon,
} from '../utils/formatters';

interface TransferDetailScreenProps {
  transfer: Transfer;
  onBack: () => void;
  onDeleted: () => void;
}

export const TransferDetailScreen: React.FC<TransferDetailScreenProps> = ({
  transfer,
  onBack,
  onDeleted,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!transfer.share_url) {
      Alert.alert('Notice', 'Share link is not available.');
      return;
    }
    try {
      await Share.share({
        title: `FileDrop: ${transfer.filename}`,
        message: `Download "${transfer.filename}" securely via FileDrop: ${transfer.share_url}`,
        url: transfer.share_url,
      });
    } catch {
      // User cancelled
    }
  };

  const handleCopyLink = () => {
    if (!transfer.share_url) return;
    Share.share({
      title: `FileDrop: ${transfer.filename}`,
      message: transfer.share_url,
    }).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transfer',
      `Are you sure you want to permanently delete "${transfer.filename}"? The R2 object will be deleted and the share link deactivated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await transfersApi.deleteTransfer(transfer.id);
              onDeleted();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete transfer');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Back button */}
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back to Transfers</Text>
      </TouchableOpacity>

      <Card variant="elevated" style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.fileIconWrapper}>
            <Text style={styles.fileIcon}>
              {getFileIcon(transfer.filename, transfer.mime_type)}
            </Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.filename}>{transfer.filename}</Text>
            <Text style={styles.mimeType}>{transfer.mime_type}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Current Status:</Text>
          <StatusBadge status={transfer.status} />
        </View>
      </Card>

      {/* Share Link Card */}
      {transfer.share_url && transfer.status === 'READY' && (
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionTitle}>Recipient Share Link</Text>
          <Text style={styles.sectionSubtitle}>
            Send this one-time link to your recipient. Once accessed, it burns.
          </Text>

          <View style={styles.urlBox}>
            <Text style={styles.urlText} selectable numberOfLines={3}>
              {transfer.share_url}
            </Text>
          </View>

          <View style={styles.shareBtnRow}>
            <Button
              title="Share Sheet"
              icon="📤"
              size="sm"
              onPress={handleShare}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title={copied ? 'Copied!' : 'Copy'}
              icon="📋"
              size="sm"
              variant="secondary"
              onPress={handleCopyLink}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      )}

      {/* Details Table */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Transfer Specifications</Text>

        <View style={styles.specRow}>
          <Text style={styles.specKey}>Transfer ID</Text>
          <Text style={[styles.specVal, { fontFamily: 'monospace', fontSize: 11 }]}>
            {transfer.id}
          </Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specKey}>File Size</Text>
          <Text style={styles.specVal}>
            {formatBytes(transfer.actual_size_bytes || transfer.declared_size_bytes)}
          </Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specKey}>Created At</Text>
          <Text style={styles.specVal}>{formatDateTime(transfer.created_at)}</Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specKey}>Expires At</Text>
          <Text style={styles.specVal}>{formatDateTime(transfer.expires_at)}</Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specKey}>Time Remaining</Text>
          <Text style={[styles.specVal, { color: colors.primary, fontWeight: '700' }]}>
            {formatTimeRemaining(transfer.expires_at)}
          </Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specKey}>Password Gate</Text>
          <Text style={styles.specVal}>
            {transfer.password_hash ? '🔒 Enabled' : 'None (Open link)'}
          </Text>
        </View>
      </Card>

      {/* Delete Action */}
      <Card style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerDesc}>
          Deleting this transfer immediately deletes the file from Cloudflare R2 and renders the public URL invalid.
        </Text>
        <Button
          title={deleting ? 'Deleting...' : 'Delete Transfer 🗑️'}
          variant="danger"
          onPress={handleDelete}
          loading={deleting}
          style={{ marginTop: 12 }}
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  backBtn: {
    marginBottom: 16,
    paddingVertical: 6,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fileIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  fileIcon: {
    fontSize: 28,
  },
  headerMeta: {
    flex: 1,
  },
  filename: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  mimeType: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  urlBox: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  urlText: {
    color: colors.secondary,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  shareBtnRow: {
    flexDirection: 'row',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specKey: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  specVal: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dangerCard: {
    borderColor: 'rgba(244, 63, 94, 0.3)',
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
  },
  dangerTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  dangerDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});
