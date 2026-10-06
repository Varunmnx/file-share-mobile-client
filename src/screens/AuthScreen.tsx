import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface AuthScreenProps {
  onOpenSettings: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onOpenSettings }) => {
  const { login, register, baseUrl } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Authentication failed. Check your server connection.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('test@example.com');
    setPassword('Password123!');
    setConfirmPassword('Password123!');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.title}>FileDrop</Text>
          <Text style={styles.subtitle}>
            Serverless temporary file & folder transfer powered by Cloudflare Workers & R2
          </Text>
        </View>

        <Card variant="elevated" style={styles.authCard}>
          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, !isRegister && styles.activeTab]}
              onPress={() => {
                setIsRegister(false);
                setError('');
              }}
            >
              <Text style={[styles.tabText, !isRegister && styles.activeTabText]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, isRegister && styles.activeTab]}
              onPress={() => {
                setIsRegister(true);
                setError('');
              }}
            >
              <Text style={[styles.tabText, isRegister && styles.activeTabText]}>
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorMessage}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="Min 8 characters"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          {isRegister && (
            <Input
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
            />
          )}

          <Button
            title={isRegister ? 'Create Account' : 'Sign In'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />

          <TouchableOpacity onPress={handleFillDemo} style={styles.demoBtn}>
            <Text style={styles.demoText}>Quick Fill Demo Credentials</Text>
          </TouchableOpacity>
        </Card>

        {/* Server endpoint config banner */}
        <TouchableOpacity
          style={styles.serverConfigBanner}
          onPress={onOpenSettings}
          activeOpacity={0.8}
        >
          <View style={styles.serverRow}>
            <Text style={styles.serverIcon}>🌐</Text>
            <View style={styles.serverTextCol}>
              <Text style={styles.serverLabel}>Backend Server URL</Text>
              <Text style={styles.serverValue} numberOfLines={1}>
                {baseUrl}
              </Text>
            </View>
            <Text style={styles.serverEdit}>Edit ⚙️</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 34,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
    lineHeight: 18,
  },
  authCard: {
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 4,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
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
  submitBtn: {
    marginTop: 14,
  },
  demoBtn: {
    marginTop: 14,
    alignItems: 'center',
    padding: 6,
  },
  demoText: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  serverConfigBanner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 24,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serverIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  serverTextCol: {
    flex: 1,
  },
  serverLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  serverValue: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  serverEdit: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
});
