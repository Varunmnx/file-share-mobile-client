import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import { colors } from '../theme/colors';
import { Button } from './Button';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  shareUrl: string;
  filename: string;
  hasPassword?: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  shareUrl,
  filename,
  hasPassword = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // In React Native, we can share or simulate clipboard
    Share.share({
      title: `FileDrop: ${filename}`,
      message: `Here is your secure file link for "${filename}": ${shareUrl}`,
    }).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        title: `FileDrop Share: ${filename}`,
        message: `Download "${filename}" securely via FileDrop: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconCircle}>
            <Text style={styles.checkIcon}>✨</Text>
          </View>

          <Text style={styles.title}>Transfer Ready!</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            "{filename}" is uploaded and secured.
          </Text>

          {hasPassword && (
            <View style={styles.lockNotice}>
              <Text style={styles.lockText}>🔒 Password Protected Link</Text>
            </View>
          )}

          <View style={styles.urlBox}>
            <Text style={styles.urlText} numberOfLines={2} selectable>
              {shareUrl}
            </Text>
          </View>

          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>⚡</Text>
            <Text style={styles.infoText}>
              One-time claim: As soon as the recipient opens and claims this file,
              the link will atomically burn and expire.
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              title="Share Link..."
              icon="📤"
              onPress={handleNativeShare}
              variant="primary"
              style={styles.actionBtn}
            />
            <Button
              title={copied ? 'Link Copied / Shared!' : 'Copy Link'}
              icon="📋"
              onPress={handleCopy}
              variant="secondary"
              style={styles.actionBtn}
            />
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  lockNotice: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 14,
  },
  lockText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  urlBox: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  urlText: {
    color: colors.secondary,
    fontSize: 13,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  actions: {
    width: '100%',
  },
  actionBtn: {
    marginBottom: 10,
  },
  closeBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
