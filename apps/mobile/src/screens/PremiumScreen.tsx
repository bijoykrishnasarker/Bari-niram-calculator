import { PREMIUM_PRICE_BDT } from '@homexbd/shared';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import {
  Card,
  Field,
  Heading,
  KeyValue,
  Notice,
  PrimaryButton,
} from '../components/Ui';
import { apiRequest, cachedPublicGet } from '../lib/api';
import { errorMessage, formatBdt } from '../lib/format';
import { colors } from '../theme';
import type { AccountSummary, PublicConfig } from '../types';
import { AuthScreen } from './AuthScreen';

export function PremiumScreen({
  account,
  refreshAccount,
}: {
  account: AccountSummary | null;
  refreshAccount(): Promise<void>;
}) {
  const { session } = useAuth();
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [last4, setLast4] = useState('');
  const [amount, setAmount] = useState(String(PREMIUM_PRICE_BDT));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void cachedPublicGet<PublicConfig>(
      'homexbd.public-config.v1',
      '/v1/config',
      60 * 60_000,
    )
      .then(setConfig)
      .catch((caught) => setError(errorMessage(caught)));
  }, []);

  async function submitPayment() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await apiRequest('/v1/devices/bind', {
        authenticated: true,
        body: JSON.stringify({ label: 'HomeXBD mobile app' }),
        method: 'POST',
      });
      await apiRequest('/v1/payments', {
        authenticated: true,
        body: JSON.stringify({
          amountBdt: Number(amount),
          senderLast4: last4,
        }),
        method: 'POST',
      });
      await refreshAccount();
      setMessage(
        'পেমেন্ট তথ্য জমা হয়েছে। যাচাই না হওয়া পর্যন্ত status pending থাকবে।',
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <Text style={styles.title}>Lifetime premium</Text>
          <Text style={styles.subtitle}>
            এক ইমেইল, এক ডিভাইস, একবার ৯৯ টাকা
          </Text>
        </View>
        <AuthScreen />
      </ScrollView>
    );
  }

  const payment = account?.latestPayment;
  const premium = account?.entitlement.plan === 'premium';

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.intro}>
        <Text style={styles.title}>Lifetime premium</Text>
        <Text style={styles.subtitle}>
          একবার পেমেন্ট, যাচাইয়ের পর স্থায়ী অ্যাক্সেস
        </Text>
      </View>

      {premium ? (
        <Card>
          <Heading>Premium সক্রিয়</Heading>
          <Notice>এই ইমেইল ও বর্তমান device-এ lifetime access চালু আছে।</Notice>
          <KeyValue label="Plan" value="Premium lifetime" />
          <KeyValue
            label="সক্রিয় হওয়ার সময়"
            value={
              account.entitlement.premiumSince
                ? new Date(account.entitlement.premiumSince).toLocaleDateString(
                    'bn-BD',
                  )
                : 'সক্রিয়'
            }
          />
        </Card>
      ) : (
        <>
          <Card>
            <Heading>যা পাবেন</Heading>
            <Text style={styles.benefit}>
              • ৫০/৩০/১০/১০ বিস্তারিত খরচ বিভাজন
            </Text>
            <Text style={styles.benefit}>• সম্পূর্ণ ১০-ধাপ নির্মাণ গাইড</Text>
            <Text style={styles.benefit}>• ক্লাউডে project history</Text>
            <Text style={styles.benefit}>
              • একই account-এর lifetime entitlement
            </Text>
            <View style={styles.priceBox}>
              <Text style={styles.price}>{formatBdt(PREMIUM_PRICE_BDT)}</Text>
              <Text style={styles.priceCaption}>একবার</Text>
            </View>
          </Card>

          {payment?.status === 'pending' ? (
            <Card>
              <Heading>যাচাই চলছে</Heading>
              <Notice tone="warning">
                আপনার পেমেন্ট অনুরোধ pending। Admin bKash statement-এর সঙ্গে মিলিয়ে
                অনুমোদন করবেন।
              </Notice>
              <KeyValue label="Amount" value={formatBdt(payment.amountBdt)} />
              <KeyValue label="Sender last 4" value={payment.senderLast4} />
            </Card>
          ) : (
            <Card>
              <Heading>bKash পেমেন্ট</Heading>
              {config?.premium.configured ? (
                <>
                  <KeyValue
                    label="bKash account"
                    value={config.premium.accountNumber ?? ''}
                  />
                  <KeyValue
                    label="সঠিক amount"
                    value={formatBdt(config.premium.amountBdt)}
                  />
                </>
              ) : (
                <Notice tone="warning">
                  bKash account number এখনও backend-এ configure করা হয়নি। পেমেন্ট
                  পাঠাবেন না।
                </Notice>
              )}
              <Field
                keyboardType="number-pad"
                label="আপনি যে amount পাঠিয়েছেন"
                maxLength={3}
                onChangeText={setAmount}
                value={amount}
              />
              <Field
                keyboardType="number-pad"
                label="Sender number-এর শেষ ৪ ডিজিট"
                maxLength={4}
                onChangeText={setLast4}
                value={last4}
              />
              <Notice tone="warning">
                শেষ ৪ ডিজিট একা payment proof নয়। তথ্য জমা দিলে স্বয়ংক্রিয়ভাবে
                premium চালু হবে না; admin statement দেখে অনুমোদন করবেন।
              </Notice>
              {error ? <Notice tone="error">{error}</Notice> : null}
              {message ? <Notice>{message}</Notice> : null}
              <PrimaryButton
                disabled={
                  !config?.premium.configured ||
                  amount !== String(PREMIUM_PRICE_BDT) ||
                  !/^\d{4}$/.test(last4)
                }
                loading={busy}
                onPress={() => void submitPayment()}
                title="পেমেন্ট তথ্য জমা দিন"
              />
            </Card>
          )}

          {payment?.status === 'rejected' ? (
            <Notice tone="error">
              আগের অনুরোধটি গ্রহণ করা হয়নি। bKash তথ্য যাচাই করে আবার জমা দিন।
              {payment.reviewNote ? ` কারণ: ${payment.reviewNote}` : ''}
            </Notice>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { gap: 14, padding: 16, paddingBottom: 32 },
  intro: { gap: 4 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14 },
  benefit: { color: colors.text, fontSize: 15, lineHeight: 23 },
  priceBox: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  price: { color: colors.greenDark, fontSize: 30, fontWeight: '800' },
  priceCaption: { color: colors.muted, fontSize: 14 },
});
