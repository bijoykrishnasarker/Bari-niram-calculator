import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../lib/api';
import { errorMessage, formatBdt } from '../lib/format';
import type { AccountSummary } from '../types';
import { AuthScreen } from './AuthScreen';

type ProjectSummary = {
  id: string;
  name: string;
  result: { totalCost: number };
  createdAt: string;
};

export function AccountScreen({
  account,
  refreshAccount,
  onClose,
}: {
  account: AccountSummary | null;
  refreshAccount(): Promise<void>;
  onClose?: () => void;
}) {
  const auth = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const premium = account?.entitlement.plan === 'premium';

  async function loadProjects() {
    if (!premium) return;
    setLoadingProjects(true);
    try {
      const payload = await apiRequest<{ projects: ProjectSummary[] }>(
        '/v1/projects',
        {
          authenticated: true,
        },
      );
      setProjects(payload.projects);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoadingProjects(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, [premium]);

  async function removeProject(projectId: string) {
    try {
      await apiRequest(`/v1/projects/${projectId}`, {
        authenticated: true,
        method: 'DELETE',
      });
      await loadProjects();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  if (!auth.session) {
    return <AuthScreen onClose={onClose} />;
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>আমার অ্যাকাউন্ট</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {auth.session.user.email}
          </Text>
        </View>

        {onClose && (
          <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollList}>
        {/* Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>অ্যাকাউন্ট ও লাইসেন্স স্ট্যাটাস</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>বর্তমান প্ল্যান</Text>
            <View
              style={[
                styles.planBadge,
                premium ? styles.planBadgePremium : styles.planBadgeFree,
              ]}
            >
              <Text
                style={[
                  styles.planBadgeText,
                  premium
                    ? styles.planBadgeTextPremium
                    : styles.planBadgeTextFree,
                ]}
              >
                {premium ? '★ Lifetime Premium' : 'Free Plan'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>ডিভাইস বাইন্ডিং</Text>
            <View
              style={[
                styles.deviceBadge,
                account?.deviceBound
                  ? styles.deviceBadgeBound
                  : styles.deviceBadgeUnbound,
              ]}
            >
              <Text
                style={[
                  styles.deviceBadgeText,
                  account?.deviceBound
                    ? styles.deviceBadgeTextBound
                    : styles.deviceBadgeTextUnbound,
                ]}
              >
                {account?.deviceBound ? 'সংযুক্ত (Bound)' : 'সংযুক্ত নয়'}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => void refreshAccount()}
            style={styles.refreshBtn}
          >
            <Text style={styles.refreshBtnText}>🔄 স্ট্যাটাস রিফ্রেশ করুন</Text>
          </Pressable>
        </View>

        {/* Cloud Projects (Premium Only) */}
        {premium && (
          <View style={styles.card}>
            <View style={styles.projectHeaderRow}>
              <Text style={styles.cardHeaderTitle}>ক্লাউডে সংরক্ষিত হিসাব</Text>
              <Text style={styles.projectCountBadge}>
                {projects.length} টি প্রজেক্ট
              </Text>
            </View>

            {loadingProjects ? (
              <ActivityIndicator
                color="#0D5C3A"
                size="small"
                style={{ paddingVertical: 16 }}
              />
            ) : projects.length === 0 ? (
              <Text style={styles.emptyText}>
                এখনও কোনো হিসাব ক্লাউডে সেভ করা হয়নি।
              </Text>
            ) : (
              projects.map((project) => (
                <View key={project.id} style={styles.projectItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.projectItemName}>{project.name}</Text>
                    <Text style={styles.projectItemMeta}>
                      {formatBdt(project.result.totalCost)} ·{' '}
                      {new Date(project.createdAt).toLocaleDateString('bn-BD')}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={6}
                    onPress={() => void removeProject(project.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>মুছুন</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* Security Warning Notice */}
        <View style={styles.warningCard}>
          <Text style={styles.warningCardText}>
            🔒 বাণিজ্যিক সুরক্ষা নীতি: এক অ্যাকাউন্ট শুধুমাত্র একটি নির্দিষ্ট
            ডিভাইসে সক্রিয় থাকবে। ফোন পরিবর্তন করলে সাপোর্টের মাধ্যমে রিসেট
            করা যাবে।
          </Text>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Logout Button */}
        <Pressable
          onPress={() => void auth.signOut()}
          style={styles.logoutBtn}
        >
          <Text style={styles.logoutBtnText}>লগআউট করুন</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  topHeader: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollList: {
    padding: 16,
    paddingBottom: 36,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeFree: {
    backgroundColor: '#F1F5F9',
  },
  planBadgePremium: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  planBadgeTextFree: {
    color: '#475569',
  },
  planBadgeTextPremium: {
    color: '#B45309',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  deviceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deviceBadgeBound: {
    backgroundColor: '#DCFCE7',
  },
  deviceBadgeUnbound: {
    backgroundColor: '#F1F5F9',
  },
  deviceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deviceBadgeTextBound: {
    color: '#15803D',
  },
  deviceBadgeTextUnbound: {
    color: '#64748B',
  },
  refreshBtn: {
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D5C3A',
  },
  projectHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D5C3A',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    paddingVertical: 10,
  },
  projectItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  projectItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  projectItemMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  warningCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  warningCardText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  errorCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    padding: 12,
  },
  errorCardText: {
    color: '#DC2626',
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },
});
