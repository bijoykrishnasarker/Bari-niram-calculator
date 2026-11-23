import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { Logo } from './src/components/Logo';
import { apiRequest } from './src/lib/api';
import { AccountScreen } from './src/screens/AccountScreen';
import { CalculatorScreen } from './src/screens/CalculatorScreen';
import { GuideScreen } from './src/screens/GuideScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PremiumScreen } from './src/screens/PremiumScreen';
import { SavedProjectsScreen } from './src/screens/SavedProjectsScreen';
import { colors } from './src/theme';
import type { AccountSummary } from './src/types';

type Tab = 'home' | 'calculator' | 'saved' | 'guide';

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'home', label: 'হোম', icon: '🏠' },
  { id: 'calculator', label: 'ক্যালকুলেটর', icon: '🧮' },
  { id: 'saved', label: 'সেভড', icon: '📑' },
  { id: 'guide', label: 'গাইড', icon: '📖' },
];

function MainApp() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  async function refreshAccount() {
    if (!auth.session) {
      setAccount(null);
      return;
    }
    setLoadingAccount(true);
    try {
      const next = await apiRequest<AccountSummary>('/v1/me', {
        authenticated: true,
      });
      setAccount(next);
    } catch {
      setAccount(null);
    } finally {
      setLoadingAccount(false);
    }
  }

  useEffect(() => {
    void refreshAccount();
  }, [auth.session?.access_token]);

  const premium = account?.entitlement.plan === 'premium';

  let screen: React.ReactNode;
  if (tab === 'home') {
    screen = (
      <HomeScreen
        account={account}
        onOpenSaved={() => setTab('saved')}
        onStartCalculator={() => setTab('calculator')}
      />
    );
  } else if (tab === 'calculator') {
    screen = (
      <CalculatorScreen
        openPremium={() => setShowPremiumModal(true)}
        premium={premium}
        signedIn={Boolean(auth.session)}
      />
    );
  } else if (tab === 'saved') {
    screen = (
      <SavedProjectsScreen
        account={account}
        onOpenCalculator={() => setTab('calculator')}
        refreshAccount={refreshAccount}
      />
    );
  } else {
    screen = (
      <GuideScreen
        openPremium={() => setShowPremiumModal(true)}
        premium={premium}
      />
    );
  }

  if (auth.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Brand Bar */}
      <View style={styles.brandBar}>
        <Pressable onPress={() => setTab('home')}>
          <Logo size="small" />
        </Pressable>

        <View style={styles.brandActions}>
          <Pressable
            onPress={() => setShowPremiumModal(true)}
            style={[
              styles.planBadge,
              premium ? styles.planBadgePremium : styles.planBadgeFree,
            ]}
          >
            <Text
              style={[
                styles.planText,
                premium ? styles.planTextPremium : styles.planTextFree,
              ]}
            >
              {loadingAccount ? '…' : premium ? '★ Premium' : 'Free'}
            </Text>
          </Pressable>

          <Pressable
            hitSlop={8}
            onPress={() => setShowAccountModal(true)}
            style={styles.accountBtn}
          >
            <Text style={styles.accountBtnText}>অ্যাকাউন্ট</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Screen View */}
      <View style={styles.content}>{screen}</View>

      {/* Bottom Navigation */}
      <View style={styles.tabBar}>
        {tabs.map((item) => {
          const isActive = tab === item.id;
          return (
            <Pressable
              accessibilityRole="tab"
              key={item.id}
              onPress={() => setTab(item.id)}
              style={styles.tab}
            >
              <Text style={styles.tabIcon}>{item.icon}</Text>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {item.label}
              </Text>
              {isActive ? <View style={styles.tabIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>

      {/* Premium Upgrade Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowPremiumModal(false)}
        visible={showPremiumModal}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>HomeXBD Premium</Text>
            <Pressable
              hitSlop={8}
              onPress={() => setShowPremiumModal(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>✕ বন্ধ করুন</Text>
            </Pressable>
          </View>
          <PremiumScreen
            account={account}
            refreshAccount={async () => {
              await refreshAccount();
              setShowPremiumModal(false);
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Account / Login Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowAccountModal(false)}
        visible={showAccountModal}
      >
        <SafeAreaView style={styles.modalSafe}>
          <AccountScreen
            account={account}
            onClose={() => setShowAccountModal(false)}
            refreshAccount={async () => {
              await refreshAccount();
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.white, flex: 1 },
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  brandBar: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  brand: { color: colors.greenDark, fontSize: 19, fontWeight: '800' },
  brandActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  planBadgeFree: {
    backgroundColor: colors.greenSoft,
    borderColor: 'rgba(11, 122, 75, 0.2)',
  },
  planBadgePremium: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  planText: { fontSize: 11, fontWeight: '700' },
  planTextFree: { color: colors.green },
  planTextPremium: { color: '#B45309' },
  accountBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  accountBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  content: { backgroundColor: colors.background, flex: 1 },
  tabBar: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 4,
    backgroundColor: colors.white,
    paddingBottom: 4,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    paddingBottom: 6,
    paddingTop: 8,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#1E3A8A', fontWeight: '800' },
  tabIndicator: {
    backgroundColor: '#1E3A8A',
    borderRadius: 2,
    height: 3,
    width: 22,
    marginTop: 2,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  modalCloseBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
});
