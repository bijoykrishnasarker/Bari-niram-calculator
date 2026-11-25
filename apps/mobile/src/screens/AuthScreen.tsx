import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../lib/format';
import { Text, tr, useLanguage } from '../i18n';

type AuthMode = 'signin' | 'signup' | 'forgot';

export function AuthScreen({
  onClose,
  initialMode = 'signin',
}: {
  onClose?: () => void;
  initialMode?: 'signin' | 'signup';
}) {
  useLanguage();
  const auth = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) {
      setError('অনুগ্রহ করে সঠিক ইমেইল অথবা মোবাইল নম্বর দিন।');
      return;
    }

    if (mode === 'forgot') {
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        await auth.resetPassword(email.trim());
        setMessage(
          'পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স চেক করুন।',
        );
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('উভয় পাসওয়ার্ড একই হতে হবে।');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signin') {
        await auth.signIn(email.trim(), password);
        if (onClose) onClose();
      } else {
        await auth.signUp(email.trim(), password);
        setMessage(
          'আপনার ইমেইলে ভেরিফিকেশন লিংক পাঠানো হয়েছে। ইমেইল খুলে অ্যাকাউন্ট নিশ্চিত করুন।',
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleGoogleLogin() {
    Alert.alert(
      'Google সাইন ইন',
      'Google OAuth কনফিগারেশন সক্রিয় করার জন্য Supabase ড্যাশবোর্ডে Google Credentials প্রদান করুন।',
      [{ text: 'ঠিক আছে' }],
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Dark Hero Section with Blueprint Grid */}
        <View style={styles.darkHeroSection}>
          {/* Subtle Grid Lines */}
          <View pointerEvents="none" style={styles.gridOverlay}>
            <View style={[styles.gridLineH, { top: 25 }]} />
            <View style={[styles.gridLineH, { top: 55 }]} />
            <View style={[styles.gridLineH, { top: 85 }]} />
            <View style={[styles.gridLineH, { top: 115 }]} />
            <View style={[styles.gridLineH, { top: 145 }]} />
            <View style={[styles.gridLineV, { left: '20%' }]} />
            <View style={[styles.gridLineV, { left: '40%' }]} />
            <View style={[styles.gridLineV, { left: '60%' }]} />
            <View style={[styles.gridLineV, { left: '80%' }]} />
          </View>

          {/* Close button if modal */}
          {onClose && (
            <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          )}

          {/* Center Glowing Icon Box */}
          <View style={styles.iconBoxGlow}>
            <View style={styles.iconBox}>
              {/* House Roof & Chimney */}
              <View style={styles.roofWrapper}>
                <View style={styles.chimney} />
                <View style={styles.roofPeak} />
              </View>
              {/* Calculator Body */}
              <View style={styles.calcBody}>
                <View style={styles.calcScreen} />
                <View style={styles.calcKeysRow}>
                  <View style={styles.calcKey} />
                  <View style={styles.calcKey} />
                  <View style={styles.calcKey} />
                </View>
                <View style={styles.calcKeysRow}>
                  <View style={styles.calcKey} />
                  <View style={styles.calcKey} />
                  <View style={[styles.calcKey, styles.calcKeyOrange]} />
                </View>
              </View>
            </View>
          </View>

          {/* Titles */}
          <Text style={styles.heroTitle}>বাড়ি নির্মাণ ক্যালকুলেটর</Text>
          <Text style={styles.heroSubtitle}>
            আপনার স্বপ্নের বাড়ির নির্ভুল খরচ হিসাব করুন
          </Text>
        </View>

        {/* White Main Card Container */}
        <View style={styles.cardContainer}>
          {/* Segmented Tab (লগইন | নতুন অ্যাকাউন্ট) */}
          {mode !== 'forgot' && (
            <View style={styles.tabContainer}>
              <Pressable
                onPress={() => {
                  setMode('signin');
                  setError(null);
                  setMessage(null);
                }}
                style={[
                  styles.tabButton,
                  mode === 'signin' && styles.tabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    mode === 'signin' && styles.tabButtonTextActive,
                  ]}
                >
                  লগইন
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setMode('signup');
                  setError(null);
                  setMessage(null);
                }}
                style={[
                  styles.tabButton,
                  mode === 'signup' && styles.tabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    mode === 'signup' && styles.tabButtonTextActive,
                  ]}
                >
                  নতুন অ্যাকাউন্ট
                </Text>
              </Pressable>
            </View>
          )}

          {/* Inputs Section */}
          <View style={styles.formGroup}>
            {/* Email / Mobile Field */}
            <Text style={styles.fieldLabel}>ইমেইল অথবা মোবাইল নম্বর</Text>
            <View style={styles.inputBox}>
              <Text style={styles.inputLeftIcon}>👤</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder={tr('example@email.com বা 017XXXXXXXX')}
                placeholderTextColor="#94A3B8"
                style={styles.textInputField}
                value={email}
              />
            </View>

            {/* Password Field */}
            {mode !== 'forgot' && (
              <>
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                  পাসওয়ার্ড
                </Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputLeftIcon}>🔒</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="password"
                    onChangeText={setPassword}
                    placeholder={tr('আপনার পাসওয়ার্ড লিখুন')}
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    style={styles.textInputField}
                    value={password}
                  />
                  <Pressable
                    hitSlop={8}
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIconBtn}
                  >
                    <Text style={styles.eyeIconText}>
                      {showPassword ? '👁️' : '👁️'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* Confirm Password (only in signup mode) */}
            {mode === 'signup' && (
              <>
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                  পাসওয়ার্ড নিশ্চিত করুন
                </Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputLeftIcon}>🔒</Text>
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={setConfirmPassword}
                    placeholder={tr('আবার পাসওয়ার্ড লিখুন')}
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    style={styles.textInputField}
                    value={confirmPassword}
                  />
                </View>
              </>
            )}

            {/* Options Row: Remember Me & Forgot Password */}
            {mode === 'signin' && (
              <View style={styles.optionsRow}>
                <Pressable
                  hitSlop={6}
                  onPress={() => setRememberMe(!rememberMe)}
                  style={styles.rememberMeWrap}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxChecked,
                    ]}
                  >
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.rememberMeText}>মনে রাখুন</Text>
                </Pressable>

                <Pressable
                  hitSlop={6}
                  onPress={() => {
                    setMode('forgot');
                    setError(null);
                    setMessage(null);
                  }}
                >
                  <Text style={styles.forgotPassText}>পাসওয়ার্ড ভুলে গেছেন?</Text>
                </Pressable>
              </View>
            )}

            {mode === 'forgot' && (
              <Pressable
                hitSlop={6}
                onPress={() => {
                  setMode('signin');
                  setError(null);
                  setMessage(null);
                }}
                style={{ marginTop: 8 }}
              >
                <Text style={styles.forgotPassText}>← লগইনে ফিরে যান</Text>
              </Pressable>
            )}

            {/* Error / Success Notifications */}
            {error && (
              <View style={styles.alertError}>
                <Text style={styles.alertErrorText}>⚠️ {error}</Text>
              </View>
            )}

            {message && (
              <View style={styles.alertSuccess}>
                <Text style={styles.alertSuccessText}>✓ {message}</Text>
              </View>
            )}

            {/* Primary Action Button (Vibrant Orange with Right Arrow) */}
            <Pressable
              disabled={busy}
              onPress={handleSubmit}
              style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.primaryBtnContent}>
                  <Text style={styles.primaryBtnText}>
                    {mode === 'signup'
                      ? 'অ্যাকাউন্ট তৈরি করুন'
                      : mode === 'forgot'
                        ? 'রিসেট লিংক পাঠান'
                        : 'লগইন করুন'}
                  </Text>
                  <Text style={styles.btnArrow}>➔</Text>
                </View>
              )}
            </Pressable>

            {/* Divider "অথবা" */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>অথবা</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Social Login */}
            <Pressable onPress={handleGoogleLogin} style={styles.googleBtn}>
              <View style={styles.googleBadge}>
                <Text style={styles.googleBadgeText}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Google দিয়ে চালিয়ে যান</Text>
            </Pressable>
          </View>
        </View>

        {/* Footer Real-time Badge */}
        <View style={styles.footerBadgeContainer}>
          <View style={styles.realtimePill}>
            <Text style={styles.shieldIcon}>🛡️</Text>
            <Text style={styles.realtimeText}>
              ইট, বালু, সিমেন্ট ও রডের রিয়েল-টাইম হিসাব
            </Text>
          </View>

          {/* Legal Terms Disclaimer */}
          <Text style={styles.legalDisclaimer}>
            চালিয়ে যাওয়ার মাধ্যমে আপনি আমাদের{' '}
            <Text style={styles.legalLink}>শর্তাবলী</Text> ও{' '}
            <Text style={styles.legalLink}>গোপনীয়তা নীতিতে</Text> সম্মত হচ্ছেন।
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#F1F5F9',
  },

  /* Top Dark Hero */
  darkHeroSection: {
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: 28,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.1,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#FFFFFF',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#FFFFFF',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Glowing Icon Box */
  iconBoxGlow: {
    padding: 2,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 12,
  },
  iconBox: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  roofWrapper: {
    alignItems: 'center',
    marginBottom: 1,
  },
  chimney: {
    position: 'absolute',
    top: -2,
    right: 4,
    width: 3,
    height: 6,
    backgroundColor: '#EA580C',
    borderRadius: 1,
  },
  roofPeak: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#F59E0B',
  },
  calcBody: {
    width: 26,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    padding: 2,
    alignItems: 'center',
  },
  calcScreen: {
    width: '100%',
    height: 5,
    backgroundColor: '#F59E0B',
    borderRadius: 1,
    marginBottom: 2,
  },
  calcKeysRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  calcKey: {
    width: 4,
    height: 4,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  calcKeyOrange: {
    backgroundColor: '#EA580C',
  },

  heroTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FBBF24',
    marginTop: 4,
    textAlign: 'center',
  },

  /* Card Container */
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },

  /* Tab Container */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },

  /* Form */
  formGroup: {},
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
    paddingHorizontal: 14,
  },
  inputLeftIcon: {
    fontSize: 15,
    marginRight: 10,
    opacity: 0.7,
  },
  textInputField: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    height: '100%',
  },
  eyeIconBtn: {
    padding: 6,
  },
  eyeIconText: {
    fontSize: 15,
    opacity: 0.6,
  },

  /* Options Row */
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 18,
  },
  rememberMeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  rememberMeText: {
    fontSize: 12.5,
    color: '#1E293B',
    fontWeight: '600',
  },
  forgotPassText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#EA580C',
  },

  /* Primary Button */
  primaryBtn: {
    backgroundColor: '#EA580C',
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnDisabled: {
    opacity: 0.65,
  },
  primaryBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  btnArrow: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerLabel: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
  },

  /* Google Button */
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
    gap: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  googleBadge: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Notifications */
  alertError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  alertErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  alertSuccess: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  alertSuccessText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
  },

  /* Footer */
  footerBadgeContainer: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  realtimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 10,
  },
  shieldIcon: {
    fontSize: 12,
  },
  realtimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  legalDisclaimer: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
  },
  legalLink: {
    textDecorationLine: 'underline',
    color: '#475569',
    fontWeight: '600',
  },
});
