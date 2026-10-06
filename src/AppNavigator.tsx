import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { colors } from './theme/colors';
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { AuthScreen } from './screens/AuthScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { UploadScreen } from './screens/UploadScreen';
import { ReceiveScreen } from './screens/ReceiveScreen';
import { TransferDetailScreen } from './screens/TransferDetailScreen';
import { PlansScreen } from './screens/PlansScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type { Transfer } from './types';
import { extractToken } from './utils/formatters';

type TabType = 'dashboard' | 'upload' | 'receive' | 'settings';
type StackView = 'none' | 'detail' | 'plans' | 'settings';

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stackView, setStackView] = useState<StackView>('none');
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [uploadInitialMode, setUploadInitialMode] = useState<'file' | 'folder'>('file');
  const [receiveInitialToken, setReceiveInitialToken] = useState<string>('');

  // Handle deep links (e.g. filedrop://s/:token or http://.../s/:token)
  useEffect(() => {
    const handleUrl = (url?: string | null) => {
      if (!url) return;
      const token = extractToken(url);
      if (token && token.length >= 10) {
        setReceiveInitialToken(token);
        setActiveTab('receive');
        setStackView('none');
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading FileDrop...</Text>
      </View>
    );
  }

  // If not logged in and not viewing Receive or Settings screen:
  if (!isAuthenticated && activeTab !== 'receive' && stackView !== 'settings') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <AuthScreen onOpenSettings={() => setStackView('settings')} />
      </SafeAreaView>
    );
  }

  // Render Stack Views (Detail, Plans, Settings)
  const renderStackContent = () => {
    if (stackView === 'detail' && selectedTransfer) {
      return (
        <TransferDetailScreen
          transfer={selectedTransfer}
          onBack={() => setStackView('none')}
          onDeleted={() => {
            setStackView('none');
            setActiveTab('dashboard');
          }}
        />
      );
    }
    if (stackView === 'plans') {
      return <PlansScreen onBack={() => setStackView('none')} />;
    }
    if (stackView === 'settings') {
      return <SettingsScreen onBack={() => setStackView('none')} />;
    }
    return null;
  };

  // Render Active Tab Content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <UploadScreen
            initialMode={uploadInitialMode}
            onUploadSuccess={() => setActiveTab('dashboard')}
            onCancel={() => setActiveTab('dashboard')}
          />
        );
      case 'receive':
        return (
          <ReceiveScreen
            initialToken={receiveInitialToken}
            onDone={() => {
              setReceiveInitialToken('');
              setActiveTab('dashboard');
            }}
          />
        );
      case 'settings':
        return <SettingsScreen onBack={() => setActiveTab('dashboard')} />;
      case 'dashboard':
      default:
        return (
          <DashboardScreen
            onNavigateUpload={(mode) => {
              setUploadInitialMode(mode || 'file');
              setActiveTab('upload');
            }}
            onNavigateReceive={() => setActiveTab('receive')}
            onNavigatePlans={() => setStackView('plans')}
            onSelectTransfer={(t) => {
              setSelectedTransfer(t);
              setStackView('detail');
            }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      {stackView === 'none' && (
        <Header
          onSettingsPress={() => setStackView('settings')}
          rightAction={
            !isAuthenticated ? (
              <TouchableOpacity
                onPress={() => setActiveTab('dashboard')}
                style={styles.signInPill}
              >
                <Text style={styles.signInPillText}>Sign In</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* Main Content Area */}
      <View style={styles.contentContainer}>
        {stackView !== 'none' ? renderStackContent() : renderTabContent()}
      </View>

      {/* Bottom Tab Bar (shown when no modal stack view is open) */}
      {stackView === 'none' && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'dashboard' && styles.activeTabItem]}
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>⚡</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'dashboard' && styles.activeTabLabel,
              ]}
            >
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'upload' && styles.activeTabItem]}
            onPress={() => {
              setUploadInitialMode('file');
              setActiveTab('upload');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>📤</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'upload' && styles.activeTabLabel,
              ]}
            >
              Upload
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'receive' && styles.activeTabItem]}
            onPress={() => setActiveTab('receive')}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>📥</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'receive' && styles.activeTabLabel,
              ]}
            >
              Receive
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'settings' && styles.activeTabItem]}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>⚙️</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'settings' && styles.activeTabLabel,
              ]}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  signInPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signInPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeTabItem: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
});
