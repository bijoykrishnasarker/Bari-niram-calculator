import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Logo';
import { errorMessage } from '../lib/format';

type AuthMode = 'signin' | 'signup' | 'forgot';

export function AuthScreen({
  onClose,
  initialMode = 'signin',
}: {
  onClose?: () => void;
  initialMode?: 'signin' | 'signup';
}) {
  const auth = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [lang, setLang] = useState<'bn' | 'en'>('bn');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) {
      setError('অনুগ্রহ করে সঠিক ইমেইল ঠিকানা দিন।');
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
        {/* Top Header: Close button (if modal) & Language Selector */}
        <View style={styles.topNavRow}>
          {onClose ? (
            <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          ) : (
            <View style={{ width: 24 }} />
          )}

          {/* Language Switcher Pill */}
          <View style={styles.langSwitchWrap}>
            <Pressable
              onPress={() => setLang('bn')}
              style={[
                styles.langOption,
                lang === 'bn' && styles.langOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.langOptionText,
                  lang === 'bn' && styles.langOptionTextActive,
                ]}
              >
                বাংলা
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLang('en')}
              style={[
                styles.langOption,
                lang === 'en' && styles.langOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.langOptionText,
                  lang === 'en' && styles.langOptionTextActive,
                ]}
              >
                EN
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Blueprint Decorative Line-art Grid Background Box */}
        <View style={styles.blueprintDecor}>
          <View style={styles.decorLine1} />
          <View style={styles.decorLine2} />
          <View style={styles.decorBox} />
        </View>

        {/* Brand Icon & Name */}
        <View style={styles.brandContainer}>
          <Logo size="large" showSubtitle={false} />
          <Text style={styles.brandSubtitle}>
            {mode === 'signup'
              ? 'নতুন অ্যাকাউন্ট খুলে আপনার বাড়ি নির্মাণের হিসাব সেভ রাখুন'
              : mode === 'forgot'
                ? 'পাসওয়ার্ড রিসেট করতে আপনার ইমেইল দিন'
                : 'বাড়ি নির্মাণের হিসাব সংরক্ষণ করতে লগইন করুন'}
          </Text>
        </View>

        {/* Config Warning Notice (if Supabase not set) */}
        {!auth.configured && (
          <View style={styles.noticeWarning}>
            <Text style={styles.noticeWarningText}>
              ⚠️ Supabase Credentials কনফিগার করা হয়নি। স্থানীয় মোডে ফ্রি হিসাব করা
              যাবে, তবে ক্লাউড লগইন বন্ধ থাকবে।
            </Text>
          </View>
        )}

        {/* Segmented Tab Bar (লগইন | নতুন অ্যাকাউন্ট) */}
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

        {/* Form Inputs */}
        <View style={styles.formWrap}>
          {/* Email Input */}
          <View style={styles.inputBox}>
            <Text style={styles.inputLeftIcon}>✉</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="ইমেইল ঠিকানা"
              placeholderTextColor="#94A3B8"
              style={styles.textInputField}
              value={email}
            />
          </View>

          {/* Password Input */}
          {mode !== 'forgot' && (
            <View style={styles.inputBox}>
              <Text style={styles.inputLeftIcon}>🔒</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                onChangeText={setPassword}
                placeholder="পাসওয়ার্ড"
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
                <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '🙈'}</Text>
              </Pressable>
            </View>
          )}

          {/* Confirm Password Input (Only in signup mode) */}
          {mode === 'signup' && (
            <View style={styles.inputBox}>
              <Text style={styles.inputLeftIcon}>🔒</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={setConfirmPassword}
                placeholder="পাসওয়ার্ড নিশ্চিত করুন"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                style={styles.textInputField}
                value={confirmPassword}
              />
            </View>
          )}

          {/* Forgot Password Link */}
          {mode === 'signin' && (
            <Pressable
              hitSlop={6}
              onPress={() => {
                setMode('forgot');
                setError(null);
                setMessage(null);
              }}
              style={styles.forgotPassBtn}
            >
              <Text style={styles.forgotPassText}>পাসওয়ার্ড ভুলে গেছেন?</Text>
            </Pressable>
          )}

          {mode === 'forgot' && (
            <Pressable
              hitSlop={6}
              onPress={() => {
                setMode('signin');
                setError(null);
                setMessage(null);
              }}
              style={styles.forgotPassBtn}
            >
              <Text style={styles.forgotPassText}>← লগইনে ফিরে যান</Text>
            </Pressable>
          )}

          {/* Error / Success Notice */}
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

          {/* Main Action Button */}
          <Pressable
            disabled={busy || !auth.configured}
            onPress={handleSubmit}
            style={[
              styles.primaryBtn,
              (busy || !auth.configured) && styles.primaryBtnDisabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'signup'
                  ? 'অ্যাকাউন্ট তৈরি করুন'
                  : mode === 'forgot'
                    ? 'রিসেট লিংক পাঠান'
                    : 'লগইন করুন'}
              </Text>
            )}
          </Pressable>

          {/* Divider "অথবা" */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>অথবা</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In Button */}
          <Pressable onPress={handleGoogleLogin} style={styles.googleBtn}>
            <View style={styles.googleIconBadge}>
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={styles.googleBtnText}>Google দিয়ে লগইন করুন</Text>
          </Pressable>
        </View>

        {/* Footer Tagline */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerTagline}>
            এক ইমেইল · এক ডিভাইস · নিরাপদ লগইন
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 36,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '700',
  },
  langSwitchWrap: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    padding: 3,
  },
  langOption: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  langOptionActive: {
    backgroundColor: '#0D5C3A',
  },
  langOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  langOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  blueprintDecor: {
    position: 'absolute',
    top: 40,
    right: 16,
    width: 140,
    height: 140,
    opacity: 0.15,
    pointerEvents: 'none',
  },
  decorLine1: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 0,
    height: 1,
    backgroundColor: '#0D5C3A',
  },
  decorLine2: {
    position: 'absolute',
    top: 0,
    bottom: 20,
    left: 40,
    width: 1,
    backgroundColor: '#0D5C3A',
  },
  decorBox: {
    position: 'absolute',
    top: 30,
    left: 30,
    width: 70,
    height: 70,
    borderWidth: 1,
    borderColor: '#0D5C3A',
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  logoBox: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#0D5C3A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D5C3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 16,
  },
  iconBuildingOutline: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roofShape: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
  },
  houseBody: {
    width: 28,
    height: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderTopWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  houseDoor: {
    width: 8,
    height: 11,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  housePillar: {
    width: 4,
    height: 11,
    backgroundColor: '#FFFFFF',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F2E20',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 19,
  },
  noticeWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  noticeWarningText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 30,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#0D5C3A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  formWrap: {
    gap: 14,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 52,
    paddingHorizontal: 14,
  },
  inputLeftIcon: {
    fontSize: 16,
    color: '#64748B',
    marginRight: 10,
  },
  textInputField: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
  },
  eyeIconBtn: {
    padding: 6,
  },
  eyeIconText: {
    fontSize: 16,
  },
  forgotPassBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 4,
  },
  forgotPassText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D5C3A',
  },
  alertError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    borderRadius: 12,
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
  },
  alertSuccessText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#0D5C3A',
    height: 52,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D5C3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 50,
    gap: 10,
  },
  googleIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  footerWrap: {
    alignItems: 'center',
    marginTop: 36,
  },
  footerTagline: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
