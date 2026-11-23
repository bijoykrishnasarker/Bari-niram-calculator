import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { colors } from '../theme';
import { Text } from '../i18n';

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function Heading({ children }: PropsWithChildren) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Body({ children }: PropsWithChildren) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.muted}
        style={[styles.input, props.editable === false && styles.inputDisabled]}
      />
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
}: {
  title: string;
  onPress(): void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </Pressable>
  );
}

export function ChoiceRow<T extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: T;
  choices: Array<{ label: string; value: T }>;
  onChange(value: T): void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceRow}>
        {choices.map((choice) => (
          <Pressable
            key={choice.value}
            onPress={() => onChange(choice.value)}
            style={[
              styles.choice,
              choice.value === value && styles.choiceSelected,
            ]}
          >
            <Text
              style={[
                styles.choiceText,
                choice.value === value && styles.choiceTextSelected,
              ]}
            >
              {choice.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Notice({
  children,
  tone = 'info',
}: PropsWithChildren<{ tone?: 'info' | 'warning' | 'error' }>) {
  return (
    <View
      style={[
        styles.notice,
        tone === 'warning' && styles.noticeWarning,
        tone === 'error' && styles.noticeError,
      ]}
    >
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

export function KeyValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <View style={styles.keyValue}>
      <Text style={styles.key}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  fieldWrap: { gap: 7 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputDisabled: { backgroundColor: colors.background, color: colors.muted },
  button: {
    alignItems: 'center',
    backgroundColor: colors.green,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { backgroundColor: colors.greenDark },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  choiceSelected: { backgroundColor: colors.green, borderColor: colors.green },
  choiceText: { color: colors.text, fontSize: 14 },
  choiceTextSelected: { color: colors.white, fontWeight: '700' },
  notice: { backgroundColor: colors.greenSoft, borderRadius: 10, padding: 12 },
  noticeWarning: { backgroundColor: colors.amberSoft },
  noticeError: { backgroundColor: colors.redSoft },
  noticeText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  keyValue: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  key: { color: colors.muted, flex: 1, fontSize: 14 },
  value: { color: colors.text, fontSize: 15, fontWeight: '700' },
});
