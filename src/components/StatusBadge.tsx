import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import type { TransferStatus } from '../types';

interface StatusBadgeProps {
  status: TransferStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'READY':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          color: colors.success,
          text: 'Ready to Claim',
          dot: '#10b981',
        };
      case 'CONSUMED':
        return {
          bg: 'rgba(148, 163, 184, 0.15)',
          color: colors.textSecondary,
          text: 'Claimed (Used)',
          dot: '#94a3b8',
        };
      case 'UPLOADING':
        return {
          bg: 'rgba(56, 189, 248, 0.15)',
          color: colors.secondary,
          text: 'Uploading...',
          dot: '#38bdf8',
        };
      case 'CREATING':
      case 'PROCESSING':
        return {
          bg: 'rgba(168, 85, 247, 0.15)',
          color: '#a855f7',
          text: 'Processing',
          dot: '#a855f7',
        };
      case 'EXPIRED':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: colors.warning,
          text: 'Expired',
          dot: '#f59e0b',
        };
      case 'FAILED':
        return {
          bg: 'rgba(244, 63, 94, 0.15)',
          color: colors.danger,
          text: 'Failed',
          dot: '#f43f5e',
        };
      case 'DELETED':
        return {
          bg: 'rgba(100, 116, 139, 0.15)',
          color: colors.textMuted,
          text: 'Deleted',
          dot: '#64748b',
        };
      default:
        return {
          bg: 'rgba(99, 102, 241, 0.15)',
          color: colors.primary,
          text: status,
          dot: colors.primary,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.label, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
