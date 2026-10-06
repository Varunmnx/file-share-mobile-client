import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { billingApi } from '../api/billing';
import type { Plan, SubscriptionResponse } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { formatBytes } from '../utils/formatters';

interface PlansScreenProps {
  onBack: () => void;
}

export const PlansScreen: React.FC<PlansScreenProps> = ({ onBack }) => {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [plansRes, subRes] = await Promise.allSettled([
          billingApi.getPlans(),
          billingApi.getSubscription(),
        ]);
        if (plansRes.status === 'fulfilled') setPlans(plansRes.value);
        if (subRes.status === 'fulfilled') setSub(subRes.value);
      } catch {
        // Handled by allSettled
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const session = await billingApi.createCheckoutSession({
        price_id: 'price_pro_monthly',
      });
      if (session.url) {
        await Linking.openURL(session.url);
      } else {
        Alert.alert('Notice', 'Checkout session created. Follow payment link.');
      }
    } catch (err: any) {
      Alert.alert(
        'Billing Notice',
        err?.response?.data?.error?.message ||
          'Unable to initialize checkout session. Ensure payment secrets are configured.'
      );
    } finally {
      setUpgrading(false);
    }
  };

  const isPro = user?.plan === 'pro';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Plans & Subscriptions</Text>
        <Text style={styles.subtitle}>
          Scale your transfer quotas with high-speed Cloudflare R2 edge delivery
        </Text>
      </View>

      {/* Free Plan Card */}
      <Card style={styles.planCard}>
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>Free Starter</Text>
            <Text style={styles.planPrice}>$0 / month</Text>
          </View>
          {!isPro && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentText}>Current Plan</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>✓</Text>
          <Text style={styles.featureText}>Max File Size: 20 MB</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>✓</Text>
          <Text style={styles.featureText}>Up to 5 concurrent active transfers</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>✓</Text>
          <Text style={styles.featureText}>100 MB total active storage</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>✓</Text>
          <Text style={styles.featureText}>7-day link retention before cleanup</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>✓</Text>
          <Text style={styles.featureText}>Password protection & one-time claim</Text>
        </View>
      </Card>

      {/* Pro Plan Card */}
      <Card variant="elevated" style={[styles.planCard, styles.proPlanCard]}>
        <View style={styles.proPill}>
          <Text style={styles.proPillText}>RECOMMENDED</Text>
        </View>

        <View style={styles.planHeader}>
          <View>
            <Text style={[styles.planName, { color: colors.secondary }]}>
              Pro Transfer
            </Text>
            <Text style={styles.planPrice}>
              $9.99 / month{' '}
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>(₹499)</Text>
            </Text>
          </View>
          {isPro && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentText}>Active Plan</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.featureItem}>
          <Text style={styles.proFeatureIcon}>⚡</Text>
          <Text style={styles.featureText}>
            <Text style={{ fontWeight: '700', color: colors.text }}>1 GB</Text> max file size per transfer
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.proFeatureIcon}>⚡</Text>
          <Text style={styles.featureText}>
            <Text style={{ fontWeight: '700', color: colors.text }}>10,000</Text> concurrent active transfers
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.proFeatureIcon}>⚡</Text>
          <Text style={styles.featureText}>
            <Text style={{ fontWeight: '700', color: colors.text }}>100 GB</Text> active storage capacity
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.proFeatureIcon}>⚡</Text>
          <Text style={styles.featureText}>
            <Text style={{ fontWeight: '700', color: colors.text }}>30-day</Text> link retention
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.proFeatureIcon}>⚡</Text>
          <Text style={styles.featureText}>Priority Cloudflare R2 multi-region CDN</Text>
        </View>

        <Button
          title={isPro ? 'Manage Subscription' : 'Upgrade to Pro ⚡'}
          onPress={handleUpgrade}
          loading={upgrading}
          style={{ marginTop: 18 }}
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
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  planCard: {
    marginBottom: 20,
    padding: 20,
  },
  proPlanCard: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  proPill: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  proPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  planPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 4,
  },
  currentBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    color: colors.textSecondary,
    fontSize: 14,
    marginRight: 10,
    fontWeight: '700',
  },
  proFeatureIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  featureText: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
});
