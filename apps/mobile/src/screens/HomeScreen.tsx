import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '../theme';
import type { AccountSummary } from '../types';

type RateItem = {
  id: string;
  name: string;
  unit: string;
  price: number;
};

const DEFAULT_RATES: RateItem[] = [
  { id: 'cement', name: 'সিমেন্ট', unit: 'ব্যাগ', price: 550 },
  { id: 'rod', name: 'রড (500W)', unit: 'টন', price: 95000 },
  { id: 'brick', name: '১ নং ইট', unit: 'পিস', price: 12 },
  { id: 'sand', name: 'বালু', unit: 'সিএফটি', price: 45 },
];

const RATES_STORAGE_KEY = '@homexbd_market_rates_v1';

export function HomeScreen({
  onStartCalculator,
  onOpenSaved,
  account,
}: {
  onStartCalculator(): void;
  onOpenSaved(): void;
  account: AccountSummary | null;
}) {
  const [rates, setRates] = useState<RateItem[]>(DEFAULT_RATES);
  const [editingRates, setEditingRates] = useState(false);
  const [tempRates, setTempRates] = useState<RateItem[]>(DEFAULT_RATES);

  // Active Mini-Calculator Modal State
  const [activeMini, setActiveMini] = useState<
    'brick' | 'roof' | 'plaster' | 'paint' | null
  >(null);

  // Mini-calculator inputs
  const [wallLength, setWallLength] = useState('10');
  const [wallHeight, setWallHeight] = useState('10');
  const [wallThickness, setWallThickness] = useState<'5' | '10'>('5');

  const [roofArea, setRoofArea] = useState('1000');
  const [roofThickness, setRoofThickness] = useState('5'); // inches

  const [plasterArea, setPlasterArea] = useState('500');

  const [paintArea, setPaintArea] = useState('1000');

  // Load saved rates
  useEffect(() => {
    async function loadRates() {
      try {
        const stored = await AsyncStorage.getItem(RATES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as RateItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRates(parsed);
          }
        }
      } catch {
        // Fallback to defaults
      }
    }
    void loadRates();
  }, []);

  async function saveRates() {
    setRates(tempRates);
    setEditingRates(false);
    try {
      await AsyncStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(tempRates));
    } catch {
      // Ignored
    }
  }

  // Mini-calc computations
  // 1. Brick: 5" wall takes ~5 bricks/sq ft, 10" takes ~10 bricks/sq ft
  const parsedWallSqFt =
    (parseFloat(wallLength) || 0) * (parseFloat(wallHeight) || 0);
  const brickCount = Math.round(
    parsedWallSqFt * (wallThickness === '5' ? 5 : 10),
  );
  const brickCementBags = (parsedWallSqFt * (wallThickness === '5' ? 0.03 : 0.06)).toFixed(1);
  const brickSandCft = Math.round(parsedWallSqFt * (wallThickness === '5' ? 0.15 : 0.3));

  // 2. Roof Casting: 1:2:4 ratio
  const parsedRoofSqFt = parseFloat(roofArea) || 0;
  const parsedRoofThickInches = parseFloat(roofThickness) || 5;
  const roofVolumeCft = parsedRoofSqFt * (parsedRoofThickInches / 12);
  const wetVolume = roofVolumeCft * 1.54; // Dry volume factor
  const roofCementBags = Math.round((wetVolume * (1 / 7)) / 1.25);
  const roofSandCft = Math.round(wetVolume * (2 / 7));
  const roofStoneCft = Math.round(wetVolume * (4 / 7));

  // 3. Plaster: 1:4 ratio, 1/2" thickness
  const parsedPlasterSqFt = parseFloat(plasterArea) || 0;
  const plasterCementBags = (parsedPlasterSqFt * 0.02).toFixed(1);
  const plasterSandCft = Math.round(parsedPlasterSqFt * 0.1);

  // 4. Paint: 1 liter covers ~110-120 sq ft (2 coats)
  const parsedPaintSqFt = parseFloat(paintArea) || 0;
  const paintLiters = (parsedPaintSqFt / 110).toFixed(1);
  const primerLiters = (parsedPaintSqFt / 140).toFixed(1);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* 1. HERO BANNER */}
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>OFFLINE & INSTANT ENGINE</Text>
        </View>

        <Text style={styles.heroTitle}>১ মিনিটে বাড়ির খরচ হিসাব করুন</Text>

        <Text style={styles.heroSubtitle}>
          জমির মাপ ও তলা সংখ্যা দিয়ে তাৎক্ষণিক ম্যাটেরিয়াল ও বাজেট রিপোর্ট তৈরি করুন।
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onStartCalculator}
          style={({ pressed }) => [
            styles.heroButton,
            pressed && styles.heroButtonPressed,
          ]}
        >
          <Text style={styles.heroButtonText}>হিসাব শুরু করুন →</Text>
        </Pressable>
      </View>

      {/* 2. LIVE RATES */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionIcon}>📈</Text>
          <Text style={styles.sectionTitle}>আজকের বাজারদর (Live Rates)</Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => {
            setTempRates([...rates]);
            setEditingRates(true);
          }}
        >
          <Text style={styles.actionLink}>দাম পরিবর্তন করুন</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.ratesScroll}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {rates.map((item) => (
          <View key={item.id} style={styles.rateCard}>
            <Text style={styles.rateName}>{item.name}</Text>
            <Text style={styles.ratePrice}>
              ৳{item.price.toLocaleString('bn-BD')}
            </Text>
            <Text style={styles.rateUnit}>/{item.unit}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 3. QUICK MINI-CALCULATORS */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>কুইক মিনি-ক্যালকুলেটর</Text>
      </View>

      <View style={styles.miniGrid}>
        {/* Brick */}
        <Pressable
          onPress={() => setActiveMini('brick')}
          style={({ pressed }) => [
            styles.miniCard,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={[styles.miniIconBox, { backgroundColor: colors.orangeSoft }]}>
            <Text style={styles.miniIcon}>🧱</Text>
          </View>
          <Text style={styles.miniTitle}>ইটের হিসাব</Text>
          <Text style={styles.miniSubtitle}>ওয়াল ও গাঁথুনির ইট</Text>
        </Pressable>

        {/* Roof Casting */}
        <Pressable
          onPress={() => setActiveMini('roof')}
          style={({ pressed }) => [
            styles.miniCard,
            styles.miniCardRoof,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={[styles.miniIconBox, { backgroundColor: colors.blueSoft }]}>
            <Text style={styles.miniIcon}>🏗️</Text>
          </View>
          <Text style={styles.miniTitle}>ছাদ ঢালাই</Text>
          <Text style={styles.miniSubtitle}>সিমেন্ট, বালু ও খোয়া</Text>
        </Pressable>

        {/* Plaster */}
        <Pressable
          onPress={() => setActiveMini('plaster')}
          style={({ pressed }) => [
            styles.miniCard,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={[styles.miniIconBox, { backgroundColor: colors.greenSoft }]}>
            <Text style={styles.miniIcon}>🔨</Text>
          </View>
          <Text style={styles.miniTitle}>প্লাস্টার হিসাব</Text>
          <Text style={styles.miniSubtitle}>ওয়াল প্লাস্টারের মসলা</Text>
        </Pressable>

        {/* Paint */}
        <Pressable
          onPress={() => setActiveMini('paint')}
          style={({ pressed }) => [
            styles.miniCard,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={[styles.miniIconBox, { backgroundColor: colors.purpleSoft }]}>
            <Text style={styles.miniIcon}>🎨</Text>
          </View>
          <Text style={styles.miniTitle}>রঙের হিসাব</Text>
          <Text style={styles.miniSubtitle}>ইন্টেরিয়র ও এক্সটেরিয়র</Text>
        </Pressable>
      </View>

      {/* 4. RECENT SAVED CALCULATIONS */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>সাম্প্রতিক সেভ করা হিসাব</Text>
        <Pressable hitSlop={8} onPress={onOpenSaved}>
          <Text style={styles.actionLink}>সব দেখুন (১)</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={onOpenSaved}
        style={({ pressed }) => [
          styles.recentCard,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.recentTop}>
          <Text style={styles.recentName}>আমার বাড়ি (২ তলা স্ট্যান্ডার্ড)</Text>
          <Text style={styles.recentDate}>আজকের সংরক্ষিত</Text>
        </View>
        <View style={styles.recentBottom}>
          <Text style={styles.recentArea}>২,০০০ বর্গফুট বিল্ট-আপ এলাকা</Text>
          <Text style={styles.recentCost}>৳ ৭০,০০,০০০</Text>
        </View>
      </Pressable>

      {/* RATE EDIT MODAL */}
      <Modal
        animationType="slide"
        onRequestClose={() => setEditingRates(false)}
        transparent
        visible={editingRates}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>বাজারদর আপডেট করুন</Text>
            <Text style={styles.modalSubheading}>
              আপনার স্থানীয় বাজারদরের সঠিক দাম বসিয়ে সংরক্ষণ করুন:
            </Text>

            {tempRates.map((item, idx) => (
              <View key={item.id} style={styles.modalRow}>
                <Text style={styles.modalLabel}>{item.name} ({item.unit})</Text>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(val) => {
                    const next = [...tempRates];
                    next[idx] = { ...item, price: parseFloat(val) || 0 };
                    setTempRates(next);
                  }}
                  style={styles.modalInput}
                  value={item.price.toString()}
                />
              </View>
            ))}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEditingRates(false)}
                style={[styles.modalBtn, styles.modalCancelBtn]}
              >
                <Text style={styles.modalCancelText}>বাতিল</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveRates()}
                style={[styles.modalBtn, styles.modalSaveBtn]}
              >
                <Text style={styles.modalSaveText}>সংরক্ষণ করুন</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MINI CALCULATOR MODAL */}
      <Modal
        animationType="fade"
        onRequestClose={() => setActiveMini(null)}
        transparent
        visible={activeMini !== null}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {activeMini === 'brick' && (
              <>
                <Text style={styles.modalHeading}>🧱 দেয়ালের ইটের হিসাব</Text>
                <Text style={styles.modalSubheading}>
                  দেয়ালের মাপ দিয়ে প্রয়োজনীয় ইট ও মসলার অনুপাত জানুন:
                </Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>দেয়ালের দৈর্ঘ্য (ফুট):</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setWallLength}
                    style={styles.modalInputFull}
                    value={wallLength}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>দেয়ালের উচ্চতা (ফুট):</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setWallHeight}
                    style={styles.modalInputFull}
                    value={wallHeight}
                  />
                </View>
                <View style={styles.toggleRow}>
                  <Pressable
                    onPress={() => setWallThickness('5')}
                    style={[
                      styles.toggleBtn,
                      wallThickness === '5' && styles.toggleBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        wallThickness === '5' && styles.toggleTextActive,
                      ]}
                    >
                      ৫ ইঞ্চি ওয়াল
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setWallThickness('10')}
                    style={[
                      styles.toggleBtn,
                      wallThickness === '10' && styles.toggleBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        wallThickness === '10' && styles.toggleTextActive,
                      ]}
                    >
                      ১০ ইঞ্চি ওয়াল
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.resultBox}>
                  <Text style={styles.resultItem}>
                    মোট এলাকা: <Text style={styles.bold}>{parsedWallSqFt} বর্গফুট</Text>
                  </Text>
                  <Text style={styles.resultItem}>
                    প্রয়োজনীয় ইট: <Text style={[styles.bold, { color: colors.orangeBright }]}>{brickCount} পিস</Text>
                  </Text>
                  <Text style={styles.resultItem}>
                    আনুমানিক সিমেন্ট: <Text style={styles.bold}>{brickCementBags} ব্যাগ</Text>
                  </Text>
                  <Text style={styles.resultItem}>
                    বালু: <Text style={styles.bold}>{brickSandCft} সিএফটি</Text>
                  </Text>
                </View>
              </>
            )}

            {activeMini === 'roof' && (
              <>
                <Text style={styles.modalHeading}>🏗️ ছাদ ঢালাই ক্যালকুলেটর</Text>
                <Text style={styles.modalSubheading}>
                  ১:২:৪ অনুপাতে সিমেন্ট, বালু ও খোয়া হিসাব:
                </Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>ছাদের আয়তন (বর্গফুট):</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setRoofArea}
                    style={styles.modalInputFull}
                    value={roofArea}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>ছাদের পুরুত্ব (ইঞ্চি):</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setRoofThickness}
                    style={styles.modalInputFull}
                    value={roofThickness}
                  />
                </View>
                <View style={styles.resultBox}>
                  <Text style={styles.resultItem}>
                    সিমেন্ট লাগবে: <Text style={[styles.bold, { color: colors.blue }]}>{roofCementBags} ব্যাগ</Text>
                  </Text>
                  <Text style={styles.resultItem}>
                    বালু লাগবে: <Text style={styles.bold}>{roofSandCft} সিএফটি</Text>
                  </Text>
                  <Text style={styles.resultItem}>
                    খোয়া / পাথর: <Text style={styles.bold}>{roofStoneCft} সিএফটি</Text>
                  </Text>
                </View>
              </>
            )}

            {activeMini === 'plaster' && (
              <>
                <Text style={styles.modalHeading}>🔨 দেয়াল প্লাস্টার হিসাব</Text>
                <Text style={styles.modalSubheading}>
                  ১:৪ অনুপাতে হাফ ইঞ্চি (০.৫") প্লাস্টার মসলা:
                </Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>প্লাস্টার এলাকা (বর্গফুট):</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setPlasterArea}
                    style={styles.modalInputFull}
                    value={plasterArea}
                  />
                </View>
                <View style={styles.resultBox}>
                  <Text style={styles.resultItem}>
                    সিমেন্ট লাগবে: <Text style={[styles.bold, { color: colors.green }]}>{plasterCementBags} ব্যাগ</Text>
                  </Text>
                  <Text style={styles.resultItem}>
                    সিলেট/লোকাল বালু: <Text style={styles.bold}>{plasterSandCft} সিএফটি</Text>
                  </Text>
                </View>
              </>
            )}

            {activeMini === 'paint' && (
              <>
                <Text style={styles.modalHeading}>🎨 রঙের হিসাব</Text>
                <Text style={styles.modalSubheading}>
                  ২ কোট ফিনিশিং ও প্রাইমার অনুপাত:
                </Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>রঙের মোট এলাকা (বর্গফুট):</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setPaintArea}
                    style={styles.modalInputFull}
                    value={paintArea}
                  />
                </View>
                <View style={styles.resultBox}>
                  <Text style={styles.resultItem}>
                    ফিনিশিং পেইন্ট: <Text style={[styles.bold, { color: colors.purple }]}>{paintLiters} লিটার</Text>
                  </Text>
                  <Text style={styles.resultItem}>
                    প্রাইমার / সিলার: <Text style={styles.bold}>{primerLiters} লিটার</Text>
                  </Text>
                </View>
              </>
            )}

            <Pressable
              onPress={() => setActiveMini(null)}
              style={[styles.modalBtn, styles.modalSaveBtn, { marginTop: 16 }]}
            >
              <Text style={styles.modalSaveText}>বন্ধ করুন</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2563EB',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroBadgeText: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#DBEAFE',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18,
  },
  heroButton: {
    backgroundColor: '#D97706',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  heroButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  heroButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionIcon: {
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  actionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  ratesScroll: {
    gap: 10,
    paddingRight: 8,
  },
  rateCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    width: 105,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rateName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 4,
  },
  ratePrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  rateUnit: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  miniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  miniCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  miniCardRoof: {
    borderColor: '#FCD34D',
    borderWidth: 1.5,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  miniIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  miniIcon: {
    fontSize: 18,
  },
  miniTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  miniSubtitle: {
    fontSize: 11,
    color: colors.muted,
  },
  recentCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recentName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  recentDate: {
    fontSize: 10,
    color: colors.muted,
  },
  recentBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentArea: {
    fontSize: 11,
    color: colors.muted,
  },
  recentCost: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.green,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  modalSubheading: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 14,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 14,
    fontWeight: '700',
    width: 100,
    textAlign: 'right',
  },
  modalInputFull: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: colors.orangeBright,
    backgroundColor: colors.orangeSoft,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  toggleTextActive: {
    color: colors.orangeBright,
    fontWeight: '800',
  },
  resultBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  resultItem: {
    fontSize: 12,
    color: colors.muted,
  },
  bold: {
    fontWeight: '800',
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  modalSaveBtn: {
    backgroundColor: colors.green,
  },
  modalSaveText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
