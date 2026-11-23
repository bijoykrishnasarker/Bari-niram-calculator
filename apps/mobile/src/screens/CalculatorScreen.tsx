import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  calculateHouseCost,
  CalculatorInputSchema,
  type CalculatorResult,
  type ConstructionType,
  type Location,
} from '@homexbd/shared';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { apiRequest } from '../lib/api';
import { errorMessage, formatBdt } from '../lib/format';
import { colors } from '../theme';
import { Text, useLanguage } from '../i18n';

type LandUnit = 'sqft' | 'katha' | 'decimal';

export function CalculatorScreen({
  premium,
  signedIn,
  openPremium,
}: {
  premium: boolean;
  signedIn: boolean;
  openPremium(): void;
}) {
  useLanguage();
  // Step state (1, 2, 3)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Land & Structure
  const [landUnit, setLandUnit] = useState<LandUnit>('sqft');
  const [rawAreaInput, setRawAreaInput] = useState('1200');
  const [foundationFloors, setFoundationFloors] = useState(5);
  const [constructionFloors, setConstructionFloors] = useState(2);

  // Step 2: Quality & Location
  const [constructionType, setConstructionType] =
    useState<ConstructionType>('standard');
  const [location, setLocation] = useState<Location>('other');

  // Step 3: Market rates verification state
  const DEFAULT_VERIFIED_RATES = {
    brick: '12',
    cement: '550',
    rod: '95000',
    sandStone: '50',
    labor: '350',
  };
  const [rates, setRates] = useState(DEFAULT_VERIFIED_RATES);
  const [projectName, setProjectName] = useState('আমার বাড়ি');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Breakdown detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Calculate equivalent square feet based on selected land unit
  const equivalentSqFt = useMemo(() => {
    const numeric = parseFloat(rawAreaInput) || 0;
    if (landUnit === 'katha') {
      return Math.round(numeric * 720);
    }
    if (landUnit === 'decimal') {
      return Math.round(numeric * 435.6);
    }
    return Math.round(numeric);
  }, [rawAreaInput, landUnit]);

  // Live calculation result
  const result: CalculatorResult | null = useMemo(() => {
    const validArea = Math.max(100, Math.min(100_000, equivalentSqFt || 100));
    const validFloors = Math.max(1, Math.min(100, constructionFloors || 1));
    const parsed = CalculatorInputSchema.safeParse({
      floorAreaSqFt: validArea,
      floors: validFloors,
      constructionType,
      location,
    });
    if (!parsed.success) return null;
    return calculateHouseCost(parsed.data);
  }, [equivalentSqFt, constructionFloors, constructionType, location]);

  async function saveProject() {
    if (!result) return;
    setBusy(true);
    setMessage(null);

    const newProject = {
      id: `proj-${Date.now()}`,
      name: projectName.trim() || 'আমার বাড়ি প্রজেক্ট',
      date: new Date().toLocaleDateString('bn-BD', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      floorAreaSqFt: equivalentSqFt,
      floors: constructionFloors,
      quality:
        constructionType === 'economy'
          ? 'Economy'
          : constructionType === 'premium'
            ? 'Luxury'
            : 'Standard',
      location,
      totalCost: result.totalCost,
      breakdown: {
        structure: result.breakdown.structure,
        finishing: result.breakdown.finishing,
        electrical: result.breakdown.electrical,
        plumbing: result.breakdown.plumbing,
        potentialSavings: result.potentialSavings,
      },
    };

    try {
      // 1. Always save locally first so user sees it in Saved Projects
      const stored = await AsyncStorage.getItem('@homexbd_saved_projects_v2');
      const existing = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem(
        '@homexbd_saved_projects_v2',
        JSON.stringify([newProject, ...existing]),
      );

      // 2. If signed in, sync to cloud API
      if (signedIn) {
        const input = CalculatorInputSchema.parse({
          floorAreaSqFt: equivalentSqFt,
          floors: constructionFloors,
          constructionType,
          location,
        });
        await apiRequest('/v1/projects', {
          authenticated: true,
          body: JSON.stringify({ name: projectName, input }),
          method: 'POST',
        }).catch(() => {
          // Cloud sync optional
        });
      }

      setMessage('✅ প্রজেক্টটি সফলভাবে সেভ হয়েছে! "সেভড" ট্যাবে দেখতে পাবেন।');
    } catch (caught) {
      setMessage(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const stepPercent = step === 1 ? '৩৩%' : step === 2 ? '৬৬%' : '১০০%';
  const stepSubtitle =
    step === 1
      ? 'ধাপ ১ / ৩ — সঠিক তথ্য দিন'
      : step === 2
        ? 'ধাপ ২ / ৩ — কোয়ালিটি ও এলাকা নির্বাচন'
        : 'ধাপ ৩ / ৩ — বাজারদর ও চূড়ান্ত বাজেট';

  return (
    <View style={styles.container}>
      {/* 1. TOP DARK HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>বাড়ির খরচ ক্যালকুলেটর</Text>
            <Text style={styles.headerSubtitle}>{stepSubtitle}</Text>
          </View>
          <Text style={styles.headerPercent}>{stepPercent}</Text>
        </View>

        {/* 3-Segment Progress Bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressSegment,
              styles.progressActive,
            ]}
          />
          <View
            style={[
              styles.progressSegment,
              step >= 2 ? styles.progressActive : styles.progressInactive,
            ]}
          />
          <View
            style={[
              styles.progressSegment,
              step === 3 ? styles.progressActive : styles.progressInactive,
            ]}
          />
        </View>

        {/* Step Tab Bar */}
        <View style={styles.stepTabsRow}>
          <Pressable
            onPress={() => setStep(1)}
            style={[styles.stepTab, step === 1 && styles.stepTabActive]}
          >
            <Text
              style={[
                styles.stepTabText,
                step === 1 && styles.stepTabTextActive,
              ]}
            >
              ১. জমি ও কাঠামো
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setStep(2)}
            style={[styles.stepTab, step === 2 && styles.stepTabActive]}
          >
            <Text
              style={[
                styles.stepTabText,
                step === 2 && styles.stepTabTextActive,
              ]}
            >
              ২. নির্মাণের মান
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setStep(3)}
            style={[styles.stepTab, step === 3 && styles.stepTabActive]}
          >
            <Text
              style={[
                styles.stepTabText,
                step === 3 && styles.stepTabTextActive,
              ]}
            >
              ৩. বাজারদর
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. SCROLLABLE STEP FORM */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ================= STEP 1: LAND & STRUCTURE ================= */}
        {step === 1 && (
          <View style={styles.stepForm}>
            {/* Card 1: Land Area */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>জমির ক্ষেত্রফল (প্রতি ফ্লোর)</Text>
                <View style={styles.convBadge}>
                  <Text style={styles.convBadgeText}>
                    = {equivalentSqFt.toLocaleString('bn-BD')} বর্গফুট
                  </Text>
                </View>
              </View>

              {/* Unit Selector Pills */}
              <View style={styles.unitPillsRow}>
                <Pressable
                  onPress={() => setLandUnit('sqft')}
                  style={[
                    styles.unitPill,
                    landUnit === 'sqft' && styles.unitPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.unitPillText,
                      landUnit === 'sqft' && styles.unitPillTextActive,
                    ]}
                  >
                    বর্গফুট (Sq.ft)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setLandUnit('katha')}
                  style={[
                    styles.unitPill,
                    landUnit === 'katha' && styles.unitPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.unitPillText,
                      landUnit === 'katha' && styles.unitPillTextActive,
                    ]}
                  >
                    কাঠা (Katha)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setLandUnit('decimal')}
                  style={[
                    styles.unitPill,
                    landUnit === 'decimal' && styles.unitPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.unitPillText,
                      landUnit === 'decimal' && styles.unitPillTextActive,
                    ]}
                  >
                    শতাংশ (Dec)
                  </Text>
                </Pressable>
              </View>

              {/* Input Field */}
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setRawAreaInput}
                style={styles.areaInput}
                value={rawAreaInput}
              />
            </View>

            {/* Card 2: Foundation Floors */}
            <View style={styles.card}>
              <View style={styles.stepperRow}>
                <View style={styles.stepperInfo}>
                  <Text style={styles.cardTitle}>ফাউন্ডেশন (কয় তলা ভিত্তি)</Text>
                  <Text style={styles.cardSubtitle}>
                    ভবিষ্যতে সর্বোচ্চ যত তলা করবেন
                  </Text>
                </View>

                <View style={styles.counterControl}>
                  <Pressable
                    hitSlop={6}
                    onPress={() =>
                      setFoundationFloors((prev) => Math.max(1, prev - 1))
                    }
                    style={styles.counterBtnMinus}
                  >
                    <Text style={styles.counterBtnMinusText}>−</Text>
                  </Pressable>

                  <Text style={styles.counterValue}>
                    {foundationFloors.toLocaleString('bn-BD')}
                  </Text>

                  <Pressable
                    hitSlop={6}
                    onPress={() =>
                      setFoundationFloors((prev) => Math.min(20, prev + 1))
                    }
                    style={styles.counterBtnPlus}
                  >
                    <Text style={styles.counterBtnPlusText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Card 3: Construction Floors */}
            <View style={styles.card}>
              <View style={styles.stepperRow}>
                <View style={styles.stepperInfo}>
                  <Text style={styles.cardTitle}>এখন কয় তলা নির্মাণ করবেন?</Text>
                  <Text style={styles.cardSubtitle}>
                    বর্তমান বাজেটের জন্য তলা সংখ্যা
                  </Text>
                </View>

                <View style={styles.counterControl}>
                  <Pressable
                    hitSlop={6}
                    onPress={() =>
                      setConstructionFloors((prev) => Math.max(1, prev - 1))
                    }
                    style={styles.counterBtnMinus}
                  >
                    <Text style={styles.counterBtnMinusText}>−</Text>
                  </Pressable>

                  <Text style={styles.counterValue}>
                    {constructionFloors.toLocaleString('bn-BD')}
                  </Text>

                  <Pressable
                    hitSlop={6}
                    onPress={() =>
                      setConstructionFloors((prev) =>
                        Math.min(foundationFloors, prev + 1),
                      )
                    }
                    style={styles.counterBtnPlus}
                  >
                    <Text style={styles.counterBtnPlusText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Next Button */}
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep(2)}
              style={styles.primaryActionButton}
            >
              <Text style={styles.primaryActionButtonText}>
                পরবর্তী ধাপ: নির্মাণের মান →
              </Text>
            </Pressable>
          </View>
        )}

        {/* ================= STEP 2: QUALITY & LOCATION ================= */}
        {step === 2 && (
          <View style={styles.stepForm}>
            <Text style={styles.stepSectionIntro}>
              আপনার বাজেট ও পছন্দ অনুযায়ী ফিনিশিংয়ের মান নির্বাচন করুন:
            </Text>

            {/* Quality Cards matching Screenshot */}
            <View style={styles.qualityCardsList}>
              {/* 1. Economy */}
              <Pressable
                onPress={() => setConstructionType('economy')}
                style={[
                  styles.qualityCard,
                  constructionType === 'economy' && styles.qualityCardActive,
                ]}
              >
                <View style={styles.qualityCardTop}>
                  <Text style={styles.qualityCardTitle}>ইকোনমি (Economy)</Text>
                  <View style={styles.ratePillBlue}>
                    <Text style={styles.ratePillBlueText}>৳৩০০০ / বর্গফুট</Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      constructionType === 'economy' && styles.radioCircleActive,
                    ]}
                  >
                    {constructionType === 'economy' && (
                      <Text style={styles.radioCheck}>✓</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.qualityCardDesc}>
                  সাধারণ মানের টাইলস, লোকাল ফিটিংস ও বেসিক ফিনিশিং
                </Text>
              </Pressable>

              {/* 2. Standard */}
              <Pressable
                onPress={() => setConstructionType('standard')}
                style={[
                  styles.qualityCard,
                  constructionType === 'standard' && styles.qualityCardActive,
                ]}
              >
                <View style={styles.qualityCardTop}>
                  <Text style={styles.qualityCardTitle}>স্ট্যান্ডার্ড (Standard)</Text>
                  <View style={styles.ratePillBlue}>
                    <Text style={styles.ratePillBlueText}>৳৩৫০০ / বর্গফুট</Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      constructionType === 'standard' && styles.radioCircleActive,
                    ]}
                  >
                    {constructionType === 'standard' && (
                      <Text style={styles.radioCheck}>✓</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.qualityCardDesc}>
                  ভালো মানের সিরামিক টাইলস, স্ট্যান্ডার্ড ফিটিংস ও প্লাস্টিক পেইন্ট
                </Text>
              </Pressable>

              {/* 3. Luxury */}
              <Pressable
                onPress={() => setConstructionType('premium')}
                style={[
                  styles.qualityCard,
                  constructionType === 'premium' && styles.qualityCardActive,
                ]}
              >
                <View style={styles.qualityCardTop}>
                  <Text style={styles.qualityCardTitle}>লাক্সারি (Luxury)</Text>
                  <View style={styles.ratePillYellow}>
                    <Text style={styles.ratePillYellowText}>৳৪৫০০ / বর্গফুট</Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      constructionType === 'premium' && styles.radioCircleActive,
                    ]}
                  >
                    {constructionType === 'premium' && (
                      <Text style={styles.radioCheck}>✓</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.qualityCardDesc}>
                  প্রিমিয়াম মিরর পলিশ টাইলস, ব্র্যান্ডেড স্যানিটারি ও লাক্সারি ইন্টেরিয়র
                </Text>
              </Pressable>
            </View>

            {/* Location selector */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>এলাকা / লোকেশন</Text>
              <Text style={styles.cardSubtitle}>
                শহর ও পরিবহন খরচের ভিত্তিতে রেট অ্যাডজাস্টমেন্ট:
              </Text>

              <View style={styles.choiceRow}>
                {[
                  { id: 'dhaka', label: 'ঢাকা (+১০%)' },
                  { id: 'chattogram', label: 'চট্টগ্রাম (+৫%)' },
                  { id: 'other', label: 'অন্যান্য (১.০x)' },
                ].map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setLocation(item.id as Location)}
                    style={[
                      styles.locPill,
                      location === item.id && styles.locPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.locPillText,
                        location === item.id && styles.locPillTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Navigation Buttons (Exact matching screenshot) */}
            <View style={styles.stepBtnRow}>
              <Pressable
                onPress={() => setStep(1)}
                style={styles.backButtonGray}
              >
                <Text style={styles.backButtonGrayText}>— পূর্ববর্তী</Text>
              </Pressable>

              <Pressable
                onPress={() => setStep(3)}
                style={styles.nextButtonDarkBlue}
              >
                <Text style={styles.nextButtonDarkBlueText}>
                  পরবর্তী: বাজারদর →
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ================= STEP 3: MARKET RATES & FINAL REPORT ================= */}
        {step === 3 && (
          <View style={styles.stepForm}>
            {/* Card: বর্তমান বাজারদর যাচাই করুন (Exact Match 4th Screenshot) */}
            <View style={styles.card}>
              <View style={styles.marketCardHeader}>
                <Text style={styles.marketCardTitle}>বর্তমান বাজারদর যাচাই করুন</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => setRates(DEFAULT_VERIFIED_RATES)}
                >
                  <Text style={styles.resetLink}>ডিফল্ট রিসেট</Text>
                </Pressable>
              </View>

              <View style={styles.rateRowsList}>
                {/* 1. Brick */}
                <View style={styles.marketRow}>
                  <Text style={styles.marketRowLabel}>১ নম্বর ইট (প্রতি পিস)</Text>
                  <View style={styles.marketRowRight}>
                    <Text style={styles.currencyTaka}>৳</Text>
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={(val) => setRates((r) => ({ ...r, brick: val }))}
                      style={styles.marketInput}
                      value={rates.brick}
                    />
                  </View>
                </View>

                {/* 2. Cement */}
                <View style={styles.marketRow}>
                  <Text style={styles.marketRowLabel}>সিমেন্ট (প্রতি বস্তা)</Text>
                  <View style={styles.marketRowRight}>
                    <Text style={styles.currencyTaka}>৳</Text>
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={(val) => setRates((r) => ({ ...r, cement: val }))}
                      style={styles.marketInput}
                      value={rates.cement}
                    />
                  </View>
                </View>

                {/* 3. Rod */}
                <View style={styles.marketRow}>
                  <Text style={styles.marketRowLabel}>রড 500W (প্রতি টন)</Text>
                  <View style={styles.marketRowRight}>
                    <Text style={styles.currencyTaka}>৳</Text>
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={(val) => setRates((r) => ({ ...r, rod: val }))}
                      style={styles.marketInput}
                      value={rates.rod}
                    />
                  </View>
                </View>

                {/* 4. Sand & Stone */}
                <View style={styles.marketRow}>
                  <Text style={styles.marketRowLabel}>বালু ও পাথর (প্রতি সিএফটি)</Text>
                  <View style={styles.marketRowRight}>
                    <Text style={styles.currencyTaka}>৳</Text>
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={(val) => setRates((r) => ({ ...r, sandStone: val }))}
                      style={styles.marketInput}
                      value={rates.sandStone}
                    />
                  </View>
                </View>

                {/* 5. Labor */}
                <View style={styles.marketRow}>
                  <Text style={styles.marketRowLabel}>মিস্ত্রি খরচ (প্রতি বর্গফুট)</Text>
                  <View style={styles.marketRowRight}>
                    <Text style={styles.currencyTaka}>৳</Text>
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={(val) => setRates((r) => ({ ...r, labor: val }))}
                      style={styles.marketInput}
                      value={rates.labor}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Navigation Action Buttons (Exact Match 4th Screenshot) */}
            <View style={styles.stepBtnRow}>
              <Pressable
                onPress={() => setStep(2)}
                style={styles.backButtonGray}
              >
                <Text style={styles.backButtonGrayText}>— পূর্ববর্তী</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowDetailModal(true)}
                style={styles.calcActionOrangeBtn}
              >
                <Text style={styles.calcActionOrangeBtnText}>
                  মোট খরচ হিসাব করুন
                </Text>
                <View style={styles.checkCircleWhite}>
                  <Text style={styles.checkCircleWhiteText}>✓</Text>
                </View>
              </Pressable>
            </View>

            {/* Cloud Save Section */}
            <View style={[styles.card, { marginTop: 4 }]}>
              <Text style={styles.cardTitle}>ক্লাউডে হিসাব সেভ করুন</Text>
              <Text style={styles.cardSubtitle}>
                ভবিষ্যতে দেখার জন্য এই হিসাবটি আপনার অ্যাকাউন্টে সংরক্ষণ করুন:
              </Text>

              <View style={{ marginTop: 8 }}>
                <Text style={styles.inputLabel}>প্রজেক্টের নাম:</Text>
                <TextInput
                  onChangeText={setProjectName}
                  style={styles.textInput}
                  value={projectName}
                />
              </View>

              <Pressable
                disabled={busy}
                onPress={() => void saveProject()}
                style={[styles.saveBtn, busy && { opacity: 0.6 }]}
              >
                <Text style={styles.saveBtnText}>
                  {busy ? 'সংরক্ষণ হচ্ছে…' : '💾 ক্লাউডে প্রজেক্ট সেভ করুন'}
                </Text>
              </Pressable>

              {message && <Text style={styles.saveMessage}>{message}</Text>}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 3. PERSISTENT BOTTOM BUDGET BAR (Matching Screenshot) */}
      {result && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarLeft}>
            <Text style={styles.bottomBarLabel}>আনুমানিক মোট বাজেট (সহিত)</Text>
            <Text style={styles.bottomBarTotal}>
              {formatBdt(result.totalCost)}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setShowDetailModal(true)}
            style={styles.bottomBarBtn}
          >
            <Text style={styles.bottomBarBtnText}>বিস্তারিত দেখুন →</Text>
          </Pressable>
        </View>
      )}

      {/* 4. DETAILED BREAKDOWN MODAL */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
        transparent
        visible={showDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>খরচের বিস্তারিত হিসাব</Text>
              <Pressable
                hitSlop={8}
                onPress={() => setShowDetailModal(false)}
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            {result && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.modalTotalBox}>
                  <Text style={styles.modalTotalLabel}>মোট আনুমানিক খরচ</Text>
                  <Text style={styles.modalTotalVal}>
                    {formatBdt(result.totalCost)}
                  </Text>
                </View>

                {/* Range */}
                <View style={styles.rangeRow}>
                  <View style={styles.rangeItem}>
                    <Text style={styles.rangeLabel}>সর্বনিম্ন সীমা</Text>
                    <Text style={styles.rangeVal}>
                      {formatBdt(result.estimatedMinimumCost)}
                    </Text>
                  </View>
                  <View style={styles.rangeItem}>
                    <Text style={styles.rangeLabel}>সর্বোচ্চ সীমা</Text>
                    <Text style={styles.rangeVal}>
                      {formatBdt(result.estimatedMaximumCost)}
                    </Text>
                  </View>
                </View>

                {/* Budget Notice */}
                <View
                  style={[
                    styles.alertBox,
                    result.budgetStatus === 'high'
                      ? styles.alertWarning
                      : styles.alertInfo,
                  ]}
                >
                  <Text
                    style={
                      result.budgetStatus === 'high'
                        ? styles.alertWarningText
                        : styles.alertInfoText
                    }
                  >
                    {result.budgetStatus === 'high'
                      ? '⚠️ বাজেট সতর্কতা: এই হিসাব ৩০ লক্ষ টাকার বেশি।'
                      : '✓ Workbook অনুযায়ী বাজেটটি Affordable সীমার মধ্যে আছে।'}
                  </Text>
                </View>

                {/* Premium Breakdown */}
                {premium ? (
                  <View style={styles.breakdownBox}>
                    <Text style={styles.breakdownHeading}>
                      প্রিমিয়াম খরচ বিভাজন
                    </Text>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>স্ট্রাকচার (৫০%):</Text>
                      <Text style={styles.breakdownVal}>
                        {formatBdt(result.breakdown.structure)}
                      </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>ফিনিশিং (৩০%):</Text>
                      <Text style={styles.breakdownVal}>
                        {formatBdt(result.breakdown.finishing)}
                      </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>ইলেক্ট্রিক্যাল (১০%):</Text>
                      <Text style={styles.breakdownVal}>
                        {formatBdt(result.breakdown.electrical)}
                      </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>প্লাম্বিং (১০%):</Text>
                      <Text style={styles.breakdownVal}>
                        {formatBdt(result.breakdown.plumbing)}
                      </Text>
                    </View>
                    <View style={[styles.breakdownRow, styles.savingsRow]}>
                      <Text style={styles.savingsLabel}>সম্ভাব্য সাশ্রয় (১০%):</Text>
                      <Text style={styles.savingsVal}>
                        {formatBdt(result.potentialSavings)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.lockedBox}>
                    <Text style={styles.lockedTitle}>
                      🔒 বিস্তারিত খরচ বিভাজন লক করা
                    </Text>
                    <Text style={styles.lockedDesc}>
                      ৫০% স্ট্রাকচার, ৩০% ফিনিশিং, ১০% ইলেক্ট্রিক্যাল ও ১০% প্লাম্বিং ব্রেকডাউন দেখতে ৯৯ টাকার Lifetime Premium আনলক করুন।
                    </Text>
                    <Pressable
                      onPress={() => {
                        setShowDetailModal(false);
                        openPremium();
                      }}
                      style={styles.unlockBtn}
                    >
                      <Text style={styles.unlockBtnText}>
                        আনলক করুন (৯৯ টাকা)
                      </Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  topHeader: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
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
  headerPercent: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
  },
  progressBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#EA580C',
  },
  progressInactive: {
    backgroundColor: '#334155',
  },
  stepTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 3,
  },
  stepTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  stepTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  stepTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stepTabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  stepForm: {
    gap: 14,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  convBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  convBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  unitPillsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  unitPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 9,
    alignItems: 'center',
  },
  unitPillActive: {
    backgroundColor: '#1E3A8A',
  },
  unitPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  unitPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  areaInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperInfo: {
    flex: 1,
    paddingRight: 10,
  },
  counterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterBtnMinus: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  counterBtnMinusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 20,
    textAlign: 'center',
  },
  counterBtnPlus: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnPlusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryActionButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  stepSectionIntro: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  qualityCardsList: {
    gap: 12,
  },
  qualityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  qualityCardActive: {
    borderColor: '#EA580C',
    backgroundColor: '#FFFFFF',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  qualityCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  qualityCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  ratePillBlue: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  ratePillBlueText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  ratePillYellow: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ratePillYellowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#EA580C',
    backgroundColor: '#EA580C',
  },
  radioCheck: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 15,
  },
  qualityCardDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  backButtonGray: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonGrayText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  nextButtonDarkBlue: {
    flex: 1.5,
    backgroundColor: '#1E3A8A',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  nextButtonDarkBlueText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  marketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 4,
  },
  marketCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  resetLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  rateRowsList: {
    gap: 10,
  },
  marketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  marketRowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  marketRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyTaka: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  marketInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    width: 105,
    textAlign: 'center',
  },
  calcActionOrangeBtn: {
    flex: 1.6,
    backgroundColor: '#D97706',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  calcActionOrangeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  checkCircleWhite: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleWhiteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  locPill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  locPillActive: {
    borderColor: '#1E3A8A',
    backgroundColor: '#EFF6FF',
  },
  locPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  locPillTextActive: {
    color: '#1E3A8A',
    fontWeight: '800',
  },
  stepBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  saveBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  saveMessage: {
    fontSize: 12,
    color: colors.green,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomBarLeft: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  bottomBarTotal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#F59E0B',
    marginTop: 1,
  },
  bottomBarBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bottomBarBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalClose: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  modalScroll: {
    marginBottom: 10,
  },
  modalTotalBox: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTotalLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  modalTotalVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F59E0B',
    marginTop: 4,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  rangeItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rangeLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  rangeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  alertBox: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  alertWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  alertWarningText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
  },
  alertInfo: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  alertInfoText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
  },
  breakdownBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  breakdownHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
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
  lockedBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  lockedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  lockedDesc: {
    fontSize: 11,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 16,
  },
  unlockBtn: {
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
