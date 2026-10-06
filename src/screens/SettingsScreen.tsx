import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import axios from 'axios';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { formatDateTime } from '../utils/formatters';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { user, baseUrl, updateBaseUrl, logout, refreshUser } = useAuth();
  const [customUrl, setCustomUrl] = useState(baseUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const presets = [
    { label: 'Android Emulator', url: 'http://10.0.2.2:8787' },
    { label: 'Localhost (iOS)', url: 'http://localhost:8787' },
    { label: 'Custom LAN IP', url: 'http://192.168.1.100:8787' },
  ];

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const target = customUrl.trim().replace(/\/+$/, '');
      const resp = await axios.get(`${target}/plans`, { timeout: 5000 });
      if (resp.status === 200) {
        setTestResult({
          ok: true,
          message: '✓ Connected successfully! Cloudflare Worker responded 200 OK.',
        });
      } else {
        setTestResult({
          ok: false,
          message: `Server returned unexpected status: ${resp.status}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: `Connection failed: ${err.message}. Ensure backend wrangler dev is running.`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveUrl = async () => {
    try {
      await updateBaseUrl(customUrl.trim());
      Alert.alert('Saved', 'Backend server URL updated.');
    } catch {
      Alert.alert('Error', 'Failed to update server URL.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Settings & Configuration</Text>

      {/* Server Configuration */}
      <Card variant="elevated" style={styles.card}>
        <Text style={styles.cardTitle}>Backend Server Connection</Text>
        <Text style={styles.cardSubtitle}>
          Configure where the mobile app routes authentication, transfers, and R2 presigned calls.
        </Text>

        <Input
          label="Server Base URL"
          placeholder="http://10.0.2.2:8787"
          value={customUrl}
          onChangeText={setCustomUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.presetLabel}>Quick Presets:</Text>
        <View style={styles.presetsRow}>
          {presets.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.presetChip,
                customUrl === p.url && styles.activePresetChip,
              ]}
              onPress={() => setCustomUrl(p.url)}
            >
              <Text
                style={[
                  styles.presetChipText,
                  customUrl === p.url && styles.activePresetChipText,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {testResult && (
          <View
            style={[
              styles.testResultBox,
              testResult.ok ? styles.testSuccess : styles.testFail,
            ]}
          >
            <Text
              style={[
                styles.testResultText,
                testResult.ok ? styles.testSuccessText : styles.testFailText,
              ]}
            >
              {testResult.message}
            </Text>
          </View>
        )}

        <View style={styles.serverActionsRow}>
          <Button
            title={testing ? 'Testing...' : 'Test Connection'}
            variant="secondary"
            size="sm"
            onPress={handleTestConnection}
            loading={testing}
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button
            title="Save URL"
            size="sm"
            onPress={handleSaveUrl}
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      {/* Account Info */}
      {user && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>User Account</Text>

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Email</Text>
            <Text style={styles.specVal}>{user.email}</Text>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specKey}>User ID</Text>
            <Text style={[styles.specVal, { fontFamily: 'monospace', fontSize: 11 }]}>
              {user.id}
            </Text>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Current Plan</Text>
            <Text style={[styles.specVal, { color: colors.primary, fontWeight: '700' }]}>
              {user.plan.toUpperCase()}
            </Text>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Member Since</Text>
            <Text style={styles.specVal}>{formatDateTime(user.created_at)}</Text>
          </View>

          <Button
            title="Refresh Account Data"
            variant="outline"
            size="sm"
            onPress={() => refreshUser()}
            style={{ marginTop: 14 }}
          />
        </Card>
      )}

      {/* Sign Out */}
      {user && (
        <Card style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Session</Text>
          <Text style={styles.dangerSubtitle}>
            Signing out will clear local tokens and cached transfer links.
          </Text>
          <Button
            title="Sign Out of FileDrop"
            variant="danger"
            onPress={handleLogout}
            style={{ marginTop: 12 }}
          />
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
  backBtn: {
    marginBottom: 16,
    paddingVertical: 6,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 18,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 16,
  },
  presetLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  presetChip: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  activePresetChip: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  presetChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  activePresetChipText: {
    color: colors.primary,
  },
  testResultBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  testSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.success,
  },
  testFail: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: colors.danger,
  },
  testResultText: {
    fontSize: 12,
  },
  testSuccessText: {
    color: colors.success,
  },
  testFailText: {
    color: colors.danger,
  },
  serverActionsRow: {
    flexDirection: 'row',
    marginTop: 4,
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
  dangerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
