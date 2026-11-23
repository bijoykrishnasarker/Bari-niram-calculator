import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../lib/api';
import { errorMessage, formatBdt } from '../lib/format';
import { colors } from '../theme';
import type { AccountSummary } from '../types';
import { AuthScreen } from './AuthScreen';
import { Text, tr, useLanguage } from '../i18n';

export type SavedProjectItem = {
  id: string;
  name: string;
  date: string;
  floorAreaSqFt: number;
  floors: number;
  quality: string;
  location: string;
  totalCost: number;
  breakdown: {
    structure: number;
    finishing: number;
    electrical: number;
    plumbing: number;
    potentialSavings: number;
  };
};

const SAVED_PROJECTS_KEY = '@homexbd_saved_projects_v2';

// Initial pre-loaded projects matching screenshot
const INITIAL_DEMO_PROJECTS: SavedProjectItem[] = [
  {
    id: 'demo-1',
    name: 'গ্রামের ডুপ্লেক্স বাড়ি - ২ তলা',
    date: '০৩ নভেম্বর, ২০২৪',
    floorAreaSqFt: 900,
    floors: 2,
    quality: 'Standard',
    location: 'other',
    totalCost: 4792800,
    breakdown: {
      structure: 2396400,
      finishing: 1437840,
      electrical: 479280,
      plumbing: 479280,
      potentialSavings: 479280,
    },
  },
  {
    id: 'demo-2',
    name: 'ঢাকা প্লট - ৫ তলা ফাউন্ডেশন',
    date: '০২ নভেম্বর, ২০২৪',
    floorAreaSqFt: 1250,
    floors: 3,
    quality: 'Luxury',
    location: 'dhaka',
    totalCost: 13531780,
    breakdown: {
      structure: 6765890,
      finishing: 4059534,
      electrical: 1353178,
      plumbing: 1353178,
      potentialSavings: 1353178,
    },
  },
];

export function SavedProjectsScreen({
  account,
  refreshAccount,
  onOpenCalculator,
}: {
  account: AccountSummary | null;
  refreshAccount(): Promise<void>;
  onOpenCalculator(): void;
}) {
  useLanguage();
  const auth = useAuth();
  const [projects, setProjects] = useState<SavedProjectItem[]>(INITIAL_DEMO_PROJECTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<SavedProjectItem | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Load from local storage
  useEffect(() => {
    async function loadStored() {
      try {
        const stored = await AsyncStorage.getItem(SAVED_PROJECTS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as SavedProjectItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
          }
        }
      } catch {
        // Keep initial demo
      }
    }
    void loadStored();
  }, []);

  async function deleteProject(id: string) {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    try {
      await AsyncStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  }

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  return (
    <View style={styles.container}>
      {/* 1. TOP DARK HEADER (Matching Screenshot) */}
      <View style={styles.topHeader}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>সেভ করা প্রজেক্টসমূহ</Text>
          <Text style={styles.headerSubtitle}>
            আপনার সংরক্ষিত বাড়ি নির্মাণের হিসাব ও রিপোর্ট
          </Text>
        </View>

        {/* Search Bar with Search Icon */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            onChangeText={setSearchQuery}
            placeholder={tr('প্রজেক্টের নাম লিখুন...')}
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable hitSlop={6} onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 2. PROJECT CARDS LIST */}
      <ScrollView
        contentContainerStyle={styles.scrollList}
        keyboardShouldPersistTaps="handled"
      >
        {filteredProjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyText}>কোনো প্রজেক্ট পাওয়া যায়নি</Text>
            <Pressable
              onPress={onOpenCalculator}
              style={styles.newCalcBtn}
            >
              <Text style={styles.newCalcBtnText}>+ নতুন হিসাব তৈরি করুন</Text>
            </Pressable>
          </View>
        ) : (
          filteredProjects.map((item) => (
            <View key={item.id} style={styles.projectCard}>
              {/* Card Top: Title, Date, Trash Delete Icon */}
              <View style={styles.cardTopRow}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardDate}>{item.date}</Text>
                </View>

                <Pressable
                  hitSlop={8}
                  onPress={() => void deleteProject(item.id)}
                  style={styles.trashBtn}
                >
                  <Text style={styles.trashIcon}>🗑️</Text>
                </Pressable>
              </View>

              {/* Tags Row (Matching Screenshot: Area, Floors, Quality) */}
              <View style={styles.tagsRow}>
                <View style={styles.tagPill}>
                  <Text style={styles.tagPillText}>
                    {(item.floorAreaSqFt * item.floors).toLocaleString('bn-BD')} বর্গফুট
                  </Text>
                </View>

                <View style={styles.tagPill}>
                  <Text style={styles.tagPillText}>
                    {item.floors.toLocaleString('bn-BD')} তলা নির্মাণ
                  </Text>
                </View>

                <View style={styles.tagPill}>
                  <Text style={styles.tagPillText}>{item.quality}</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.cardDivider} />

              {/* Bottom Row: Cost on left, "বিস্তারিত দেখুন →" on right */}
              <View style={styles.cardBottomRow}>
                <View>
                  <Text style={styles.costLabel}>মোট খরচ</Text>
                  <Text style={styles.costAmount}>{formatBdt(item.totalCost)}</Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedProject(item)}
                  style={styles.detailsBtn}
                >
                  <Text style={styles.detailsBtnText}>বিস্তারিত দেখুন —</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* Account & Sync Pill Card */}
        <Pressable
          onPress={() => setShowAccountModal(true)}
          style={styles.accountCard}
        >
          <View style={styles.accountCardLeft}>
            <Text style={styles.accountCardIcon}>👤</Text>
            <View>
              <Text style={styles.accountCardTitle}>
                {auth.session ? auth.session.user.email : 'ক্লাউড ব্যাকআপ ও অ্যাকাউন্ট'}
              </Text>
              <Text style={styles.accountCardSubtitle}>
                {account?.entitlement.plan === 'premium'
                  ? 'Lifetime Premium সক্রিয়'
                  : 'লগইন করে একাধিক ডিভাইসে সেভ রাখুন'}
              </Text>
            </View>
          </View>
          <Text style={styles.accountCardArrow}>→</Text>
        </Pressable>
      </ScrollView>

      {/* 3. DETAILS MODAL */}
      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedProject(null)}
        transparent
        visible={selectedProject !== null}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedProject && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedProject.name}</Text>
                    <Text style={styles.modalSubtitle}>{selectedProject.date}</Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => setSelectedProject(null)}
                    style={styles.modalClose}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: 400 }}>
                  <View style={styles.modalTotalBox}>
                    <Text style={styles.modalTotalLabel}>মোট বাজেট</Text>
                    <Text style={styles.modalTotalVal}>
                      {formatBdt(selectedProject.totalCost)}
                    </Text>
                  </View>

                  <View style={styles.breakdownBox}>
                    <Text style={styles.breakdownHeading}>খরচের বিভাজন</Text>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>স্ট্রাকচার (৫০%):</Text>
                      <Text style={styles.breakdownVal}>
                        {formatBdt(selectedProject.breakdown.structure)}
                      </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>ফিনিশিং (৩০%):</Text>
                      <Text style={styles.breakdownVal}>
                        {formatBdt(selectedProject.breakdown.finishing)}
                      </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>ইলেক্ট্রিক্যাল (১০%):</Text>
                      <Text style={styles.breakdownVal}>
                        {formatBdt(selectedProject.breakdown.electrical)}
                      </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>প্লাম্বিং (১০%):</Text>
                      <Text style={styles.breakdownVal}>
                        {formatBdt(selectedProject.breakdown.plumbing)}
                      </Text>
                    </View>
                    <View style={[styles.breakdownRow, styles.savingsRow]}>
                      <Text style={styles.savingsLabel}>সম্ভাব্য সাশ্রয় (১০%):</Text>
                      <Text style={styles.savingsVal}>
                        {formatBdt(selectedProject.breakdown.potentialSavings)}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <Pressable
                  onPress={() => setSelectedProject(null)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeBtnText}>বন্ধ করুন</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 4. ACCOUNT / LOGIN MODAL */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowAccountModal(false)}
        visible={showAccountModal}
      >
        <View style={styles.accountModalView}>
          <View style={styles.accountModalHeader}>
            <Text style={styles.accountModalTitle}>অ্যাকাউন্ট ও ডিভাইস</Text>
            <Pressable
              hitSlop={8}
              onPress={() => setShowAccountModal(false)}
            >
              <Text style={styles.accountModalClose}>✕ বন্ধ করুন</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            {!auth.session ? (
              <AuthScreen />
            ) : (
              <View style={styles.loggedInBox}>
                <Text style={styles.userEmail}>{auth.session.user.email}</Text>
                <Text style={styles.userPlan}>
                  প্ল্যান: {account?.entitlement.plan === 'premium' ? 'Lifetime Premium' : 'Free'}
                </Text>
                <Pressable
                  onPress={() => void refreshAccount()}
                  style={styles.refreshBtn}
                >
                  <Text style={styles.refreshBtnText}>স্ট্যাটাস রিফ্রেশ করুন</Text>
                </Pressable>
                <Pressable
                  onPress={() => void auth.signOut()}
                  style={styles.signOutBtn}
                >
                  <Text style={styles.signOutBtnText}>লগআউট</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerInfo: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    padding: 0,
  },
  clearSearch: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollList: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
  },
  trashBtn: {
    padding: 4,
  },
  trashIcon: {
    fontSize: 15,
    opacity: 0.6,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tagPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  costAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  detailsBtn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  newCalcBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newCalcBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  accountCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  accountCardIcon: {
    fontSize: 20,
  },
  accountCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  accountCardArrow: {
    fontSize: 16,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalClose: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  modalTotalBox: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTotalLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  modalTotalVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F59E0B',
    marginTop: 2,
  },
  breakdownBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakdownHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  savingsRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    marginTop: 2,
  },
  savingsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.green,
  },
  savingsVal: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.green,
  },
  closeBtn: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 14,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  accountModalView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  accountModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  accountModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  accountModalClose: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  loggedInBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  userPlan: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  refreshBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  signOutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  signOutBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
});
