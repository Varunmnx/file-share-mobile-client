import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { formatBytes } from '../utils/formatters';

interface ProgressBarProps {
  percent: number;
  loadedBytes?: number;
  totalBytes?: number;
  label?: string;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  loadedBytes,
  totalBytes,
  label,
  color = colors.primary,
}) => {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {label ? <Text style={styles.label}>{label}</Text> : <View />}
        <Text style={styles.percentText}>
          {clamped}%
          {loadedBytes !== undefined && totalBytes !== undefined && (
            <Text style={styles.bytesText}>
              {' '}
              ({formatBytes(loadedBytes)} / {formatBytes(totalBytes)})
            </Text>
          )}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  percentText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  bytesText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '400',
  },
  track: {
    height: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
