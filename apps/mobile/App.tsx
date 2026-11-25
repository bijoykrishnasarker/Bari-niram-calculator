import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { Logo } from './src/components/Logo';
import { apiRequest } from './src/lib/api';
import { AccountScreen } from './src/screens/AccountScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { CalculatorScreen } from './src/screens/CalculatorScreen';
import { GuideScreen } from './src/screens/GuideScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PremiumScreen } from './src/screens/PremiumScreen';
import { SavedProjectsScreen } from './src/screens/SavedProjectsScreen';
import { colors } from './src/theme';
import type { AccountSummary } from './src/types';
import { LanguageProvider, Text, useLanguage } from './src/i18n';

type Tab = 'home' | 'calculator' | 'saved' | 'guide';

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'home', label: 'হোম', icon: '🏠' },
  { id: 'calculator', label: 'ক্যালকুলেটর', icon: '🧮' },
  { id: 'saved', label: 'সেভড', icon: '📑' },
  { id: 'guide', label: 'গাইড', icon: '📖' },
];

function MainApp() {
  useLanguage();
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

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
  const isAdmin =
    auth.session?.user?.email === 'bijoysarker0171@gmail.com' ||
    account?.user?.email === 'bijoysarker0171@gmail.com';

  let screen: React.ReactNode;
  if (tab === 'home') {
    screen = (
      <HomeScreen
        account={account}
        onOpenSaved={() => setTab('saved')}
        onStartCalculator={() => setTab('calculator')}
        openPremium={() => setShowPremiumModal(true)}
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

  // 1st screen: Always show Login page if user is not signed in
  if (!auth.session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <AuthScreen />
      </SafeAreaView>
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
          {isAdmin ? (
            <Pressable
              hitSlop={8}
              onPress={() => setShowAdminModal(true)}
              style={styles.adminBtn}
            >
              <Text style={styles.adminBtnText}>⚙️ অ্যাডমিন</Text>
            </Pressable>
          ) : null}

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
            <Text style={styles.modalTitle}>লাইফটাইম প্রিমিয়াম</Text>
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

      {/* Super Admin Control Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowAdminModal(false)}
        visible={showAdminModal}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>অ্যাডমিন কন্ট্রোল সেন্টার</Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>
                bijoysarker0171@gmail.com • Super Admin
              </Text>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => setShowAdminModal(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>✕ বন্ধ করুন</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            {/* Rates Card */}
            <View style={styles.adminCard}>
              <Text style={styles.adminCardTitle}>📈 লাইভ বাজারদর নিয়ন্ত্রণ</Text>
              <Text style={styles.adminCardDesc}>
                অ্যাডমিন বাজারদর নিয়ন্ত্রণ প্যানেল থেকে যেকোনো সময় নির্মাণ সামগ্রীর বাজারদর আপডেট করতে পারেন।
              </Text>
              <Pressable
                onPress={() => {
                  setShowAdminModal(false);
                  setTab('home');
                }}
                style={styles.adminActionBtn}
              >
                <Text style={styles.adminActionBtnText}>হোমস্ক্রিন বাজারদর দেখুন ও আপডেট করুন →</Text>
              </Pressable>
            </View>

            {/* Analytics Card */}
            <View style={styles.adminCard}>
              <Text style={styles.adminCardTitle}>📊 হিসাব-নিকাশ ও ডাটা</Text>
              <Text style={styles.adminCardDesc}>
                ইউজারদের সংরক্ষিত প্রজেক্ট দেখতে "সেভড" ট্যাবে যান।
              </Text>
              <Pressable
                onPress={() => {
                  setShowAdminModal(false);
                  setTab('saved');
                }}
                style={styles.adminActionBtn}
              >
                <Text style={styles.adminActionBtnText}>সংরক্ষিত হিসাবসমূহ দেখুন →</Text>
              </Pressable>
            </View>

            {/* System Status Card */}
            <View style={styles.adminCard}>
              <Text style={styles.adminCardTitle}>👥 সিস্টেম ও অ্যাকাউন্ট স্ট্যাটাস</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                সুপার অ্যাডমিন: bijoysarker0171@gmail.com{'\n'}
                ডাটাবেজ: Supabase Connected{'\n'}
                রোল: Full System Administrator
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <MainApp />
      </LanguageProvider>
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
  adminBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  adminBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },
  adminCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  adminCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  adminCardDesc: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  adminActionBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  adminActionBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
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
