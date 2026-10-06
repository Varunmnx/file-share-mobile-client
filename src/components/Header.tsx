import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onSettingsPress?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onSettingsPress,
  rightAction,
}) => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>⚡</Text>
        </View>
        <View>
          <Text style={styles.brandTitle}>{title || 'FileDrop'}</Text>
          {subtitle ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : user ? (
            <View style={styles.userRow}>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user.email}
              </Text>
              <View
                style={[
                  styles.planBadge,
                  user.plan === 'pro' ? styles.proPlanBadge : styles.freePlanBadge,
                ]}
              >
                <Text
                  style={[
                    styles.planText,
                    user.plan === 'pro' ? styles.proPlanText : styles.freePlanText,
                  ]}
                >
                  {user.plan.toUpperCase()}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {rightAction}
        {onSettingsPress && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onSettingsPress}
            activeOpacity={0.7}
          >
            <Text style={styles.iconText}>⚙️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoIcon: {
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    maxWidth: 160,
  },
  planBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freePlanBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  proPlanBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  planText: {
    fontSize: 10,
    fontWeight: '700',
  },
  freePlanText: {
    color: colors.textSecondary,
  },
  proPlanText: {
    color: colors.primary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  iconText: {
    fontSize: 18,
  },
});
