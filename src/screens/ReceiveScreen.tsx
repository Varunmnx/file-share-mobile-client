import React, { useState, useEffect } from 'react';
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
import { recipientApi } from '../api/recipient';
import { fileDownloader, type DownloadProgress } from '../services/fileDownloader';
import type { TransferInfo, AccessResult } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import {
  formatBytes,
  formatDateTime,
  formatTimeRemaining,
  getFileIcon,
  extractToken,
} from '../utils/formatters';

interface ReceiveScreenProps {
  initialToken?: string;
  onDone?: () => void;
}

export const ReceiveScreen: React.FC<ReceiveScreenProps> = ({
  initialToken = '',
  onDone,
}) => {
  const [inputUrl, setInputUrl] = useState(initialToken);
  const [token, setToken] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null);
  const [fetchError, setFetchError] = useState('');

  // Password unlock state
  const [password, setPassword] = useState('');
  const [grantToken, setGrantToken] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // Claim and download state
  const [isClaiming, setIsClaiming] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState<number | undefined>();
  const [totalBytes, setTotalBytes] = useState<number | undefined>();
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);
  const [claimError, setClaimError] = useState('');

  useEffect(() => {
    if (initialToken) {
      handleLookup(initialToken);
    }
  }, [initialToken]);

  const handleLookup = async (valueToLookup?: string) => {
    const rawInput = valueToLookup !== undefined ? valueToLookup : inputUrl;
    const cleanToken = extractToken(rawInput);
    if (!cleanToken) {
      setFetchError('Please enter a share token or full link.');
      return;
    }

    setToken(cleanToken);
    setLoadingInfo(true);
    setFetchError('');
    setTransferInfo(null);
    setGrantToken(null);
    setPassword('');
    setSavedFilePath(null);
    setClaimError('');

    try {
      const data = await recipientApi.getTransferInfo(cleanToken);
      setTransferInfo(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 410) {
        setFetchError('This transfer has expired or has already been downloaded (one-time link).');
      } else if (status === 404) {
        setFetchError('Transfer not found. Check the token or link.');
      } else {
        setFetchError(err?.response?.data?.error?.message || 'Failed to fetch transfer info.');
      }
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setUnlockError('Please enter the password.');
      return;
    }
    setUnlocking(true);
    setUnlockError('');

    try {
      const grant = await recipientApi.verifyPassword(token, password.trim());
      setGrantToken(grant);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        setUnlockError('Incorrect password. Please try again.');
      } else if (status === 429) {
        setUnlockError('Too many password attempts. Rate limit exceeded.');
      } else {
        setUnlockError(err?.response?.data?.error?.message || 'Password verification failed.');
      }
    } finally {
      setUnlocking(false);
    }
  };

  const handleClaimAndDownload = async () => {
    if (transferInfo?.has_password && !grantToken) {
      setClaimError('Password unlock is required before claiming.');
      return;
    }

    setIsClaiming(true);
    setClaimError('');
    setDownloadProgress(0);

    try {
      // 1. Claim atomic one-time access to get presigned GET URL
      const access: AccessResult = await recipientApi.claimAccess(
        token,
        grantToken || undefined
      );

      // 2. Download file directly to device storage
      const localPath = await fileDownloader.downloadFile(
        access.download_url,
        access.filename,
        (progress: DownloadProgress) => {
          setDownloadProgress(progress.percent);
          setDownloadedBytes(progress.bytesWritten);
          setTotalBytes(progress.contentLength);
        }
      );

      setSavedFilePath(localPath);
      // Update transfer status in view
      setTransferInfo((prev) => (prev ? { ...prev, status: 'CONSUMED' } : null));
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 410) {
        setClaimError(
          'Transfer already claimed! This link was one-time use and has been burned.'
        );
      } else if (status === 403) {
        setClaimError('Forbidden: Invalid or expired password grant.');
      } else {
        setClaimError(err?.message || 'Failed to download file.');
      }
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Lookup Card */}
      <Card variant="elevated" style={styles.card}>
        <Text style={styles.title}>Claim & Download File</Text>
        <Text style={styles.subtitle}>
          Enter a FileDrop share token or paste the full share URL from your sender.
        </Text>

        <Input
          label="Share Link or Token"
          placeholder="e.g. https://filedrop.io/s/abc123... or raw token"
          value={inputUrl}
          onChangeText={setInputUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Button
          title={loadingInfo ? 'Looking up...' : 'Find Transfer 🔍'}
          onPress={() => handleLookup()}
          loading={loadingInfo}
          style={styles.lookupBtn}
        />

        {fetchError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorMessage}>{fetchError}</Text>
          </View>
        ) : null}
      </Card>

      {/* Transfer Information Display */}
      {transferInfo && (
        <Card variant="elevated" style={styles.card}>
          <View style={styles.metaTop}>
            <View style={styles.fileIconWrapper}>
              <Text style={styles.fileIcon}>
                {getFileIcon(transferInfo.filename, transferInfo.mime_type)}
              </Text>
            </View>
            <View style={styles.fileMetaCol}>
              <Text style={styles.filename} numberOfLines={2}>
                {transferInfo.filename}
              </Text>
              <Text style={styles.fileSize}>
                {formatBytes(transferInfo.size_bytes)}
              </Text>
            </View>
            <StatusBadge status={transferInfo.status} />
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expires:</Text>
            <Text style={styles.detailValue}>
              {formatDateTime(transferInfo.expires_at)} ({formatTimeRemaining(transferInfo.expires_at)})
            </Text>
          </View>

          {/* Password Section */}
          {transferInfo.has_password && (
            <View style={styles.passwordSection}>
              <View style={styles.pwHeaderRow}>
                <Text style={styles.pwIcon}>🔒</Text>
                <Text style={styles.pwTitle}>Password Protected Transfer</Text>
              </View>

              {grantToken ? (
                <View style={styles.grantSuccessBanner}>
                  <Text style={styles.grantSuccessText}>
                    ✓ Password verified! Secure grant issued for 5 minutes.
                  </Text>
                </View>
              ) : (
                <View>
                  <Input
                    label="Enter Unlock Password"
                    placeholder="Password provided by sender"
                    value={password}
                    onChangeText={setPassword}
                    isPassword
                  />

                  {unlockError ? (
                    <Text style={styles.unlockErrorText}>{unlockError}</Text>
                  ) : null}

                  <Button
                    title="Verify Password"
                    size="sm"
                    variant="secondary"
                    onPress={handleVerifyPassword}
                    loading={unlocking}
                    style={{ marginTop: 8 }}
                  />
                </View>
              )}
            </View>
          )}

          {/* Download Progress */}
          {isClaiming && (
            <View style={styles.downloadProgressWrapper}>
              <Text style={styles.downloadingText}>Downloading from R2 storage...</Text>
              <ProgressBar
                percent={downloadProgress}
                loadedBytes={downloadedBytes}
                totalBytes={totalBytes}
                color={colors.success}
              />
            </View>
          )}

          {/* Success Banner */}
          {savedFilePath && (
            <View style={styles.successBanner}>
              <Text style={styles.successIcon}>🎉</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>Download Complete!</Text>
                <Text style={styles.successDesc} numberOfLines={2}>
                  Saved to: {savedFilePath}
                </Text>
              </View>
            </View>
          )}

          {/* Claim Error */}
          {claimError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorMessage}>{claimError}</Text>
            </View>
          ) : null}

          {/* Claim Action Button */}
          {!savedFilePath && (
            <Button
              title={
                isClaiming
                  ? 'Downloading...'
                  : transferInfo.status === 'CONSUMED'
                  ? 'Link Already Claimed'
                  : 'Claim & Download Now (One-Time) ⬇️'
              }
              onPress={handleClaimAndDownload}
              loading={isClaiming}
              disabled={
                isClaiming ||
                transferInfo.status !== 'READY' ||
                (transferInfo.has_password && !grantToken)
              }
              variant="primary"
              style={{ marginTop: 14 }}
            />
          )}

          {savedFilePath && onDone && (
            <Button
              title="Done"
              variant="outline"
              onPress={onDone}
              style={{ marginTop: 14 }}
            />
          )}
        </Card>
      )}
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
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  lookupBtn: {
    marginTop: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorMessage: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  metaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  fileIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileIcon: {
    fontSize: 24,
  },
  fileMetaCol: {
    flex: 1,
    marginRight: 8,
  },
  filename: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  fileSize: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  detailValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  passwordSection: {
    marginTop: 12,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pwHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pwIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  pwTitle: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '700',
  },
  grantSuccessBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    padding: 10,
  },
  grantSuccessText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  unlockErrorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  downloadProgressWrapper: {
    marginTop: 14,
  },
  downloadingText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  successIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  successTitle: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '800',
  },
  successDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
