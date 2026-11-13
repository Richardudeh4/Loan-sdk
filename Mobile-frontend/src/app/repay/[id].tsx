import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import {
  AmountField,
  Banner,
  Card,
  EmptyState,
  IconButton,
  InkSurface,
  KeyValueRow,
  SectionHeader,
  Skeleton,
} from '@/components/ui';
import { ConfirmPaymentSheet, Money, RepaymentRow } from '@/components/loan';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { loanApi, ApiError, type LoanDetail } from '@/RequestHandler/Request';
import { fmtDate, formatNaira, relativeDue, uuid } from '@/utils/format';
import { toast } from 'sonner-native';

export default function RepaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useStatusBarStyle('light');

  const [data, setData] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [amountStr, setAmountStr] = useState('');
  const [payMode, setPayMode] = useState<'full' | 'part'>('full');
  const [showConfirm, setShowConfirm] = useState(false);
  const [paying, setPaying] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [payError, setPayError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setError('');
    try {
      const detail = await loanApi.detail(id);
      setData(detail);
    } catch {
      setError('We couldn\'t load your repayment details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const currentInst =
    data?.schedule.find((i) => i.status === 'PENDING' || i.status === 'PARTIAL' || i.status === 'OVERDUE') ?? null;

  const instalmentDue = currentInst
    ? currentInst.totalDueKobo + currentInst.overdueChargeKobo - currentInst.amountPaidKobo
    : 0;

  const parsedAmount = parseFloat(amountStr.replace(/,/g, '')) || 0;
  const amountKobo = payMode === 'full' ? instalmentDue : Math.round(parsedAmount * 100);
  const isPartial = payMode === 'part' && amountKobo < instalmentDue;
  const loanBalance = data?.loan.balanceKobo ?? 0;

  const isValid =
    data?.loan.status === 'ACTIVE' &&
    currentInst !== null &&
    amountKobo >= 100 &&
    amountKobo <= loanBalance;

  const handlePay = async () => {
    if (!data || !isValid) return;
    setPaying(true);
    setPayError('');
    setSuccessMsg('');
    try {
      await loanApi.repay(data.loan.id, { amountKobo, reference: uuid() });
      setShowConfirm(false);
      setAmountStr('');
      setPayMode('full');
      setSuccessMsg(`Payment of ${formatNaira(amountKobo)} received.`);
      toast.success('Payment received');
      await load();
    } catch (err) {
      setShowConfirm(false);
      setPayError(err instanceof ApiError ? err.message : 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const payBalance = async (successText: string) => {
    if (!data) return;
    setPaying(true);
    setPayError('');
    setSuccessMsg('');
    try {
      await loanApi.repay(data.loan.id, { amountKobo: loanBalance, reference: uuid() });
      setSuccessMsg(successText);
      toast.success(successText);
      await load();
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : 'Payment failed.');
    } finally {
      setPaying(false);
    }
  };

  const headerBar = (subtitle?: string) => (
    <View style={styles.headerBar}>
      <IconButton icon="chevron-back" variant="glass" onPress={() => router.back()} accessibilityLabel="Go back" />
      <View style={{ flex: 1, marginLeft: Spacing.sm + 4 }}>
        <AppText variant="label" color={Colors.ink.text}>Make a payment</AppText>
        {subtitle ? <AppText variant="caption" color={Colors.ink.textMuted}>{subtitle}</AppText> : null}
      </View>
      <View style={styles.secure}>
        <Ionicons name="lock-closed" size={11} color={Colors.ink.accent} />
        <AppText variant="caption" color={Colors.ink.textMuted}>Secure</AppText>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <InkSurface radius={0} style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
          {headerBar()}
          <Skeleton width={100} height={12} onInk style={{ marginTop: Spacing.xl }} />
          <Skeleton width={200} height={46} onInk style={{ marginTop: 12 }} />
        </InkSurface>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.container}>
        <InkSurface radius={0} style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
          {headerBar()}
        </InkSurface>
        <View style={{ padding: Spacing.gutter }}>
          <EmptyState
            icon="cloud-offline-outline"
            tone="error"
            title="Something went wrong"
            body={error || 'Loan not found'}
            action={<AppButton label="Try again" variant="secondary" onPress={() => { setLoading(true); load(); }} />}
          />
        </View>
      </View>
    );
  }

  const { loan, repayments, stats } = data;
  const totalPaid = repayments.filter((r) => r.status === 'SUCCESS').reduce((sum, r) => sum + r.amountKobo, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ink.text} progressViewOffset={insets.top} />}
      >
        <InkSurface radius={0} style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
          {headerBar(loan.purpose ?? 'Personal loan')}

          <View style={{ marginTop: Spacing.xl }}>
            <AppText variant="overline" color={Colors.ink.textMuted}>
              {currentInst ? 'Amount due' : 'Outstanding balance'}
            </AppText>
            <View style={{ marginTop: 6 }}>
              <Money
                kobo={currentInst ? instalmentDue : loan.balanceKobo}
                size="xl"
                color={Colors.ink.text}
                fractionColor={Colors.ink.textFaint}
              />
            </View>
            {currentInst ? (
              <AppText
                variant="caption"
                color={currentInst.status === 'OVERDUE' ? '#FCA5A5' : Colors.ink.accent}
                style={{ marginTop: 4, fontFamily: Fonts.semibold }}
              >
                {relativeDue(currentInst.dueDate)} · {fmtDate(currentInst.dueDate)}
              </AppText>
            ) : null}
          </View>

          <View style={styles.heroStats}>
            <HeroStat label="Total paid" value={formatNaira(totalPaid, { decimals: false })} />
            <View style={styles.heroDivider} />
            <HeroStat label="Remaining" value={formatNaira(loan.balanceKobo, { decimals: false })} />
            <View style={styles.heroDivider} />
            <HeroStat label="Instalments" value={`${stats.paidCount} of ${stats.totalCount}`} />
          </View>
        </InkSurface>

        <View style={styles.body}>
          {successMsg ? <Banner tone="success" text={successMsg} style={{ marginBottom: Spacing.md }} /> : null}
          {payError ? <Banner tone="error" text={payError} style={{ marginBottom: Spacing.md }} /> : null}

          {loan.status === 'ACTIVE' ? (
            currentInst ? (
              <Card>
                <AppText variant="overline">Instalment {currentInst.instalmentNumber} of {stats.totalCount}</AppText>
                <View style={styles.bill}>
                  <KeyValueRow label="Instalment amount" value={formatNaira(currentInst.totalDueKobo)} />
                  {currentInst.overdueChargeKobo > 0 ? (
                    <KeyValueRow
                      label="Overdue fee (5%)"
                      value={`+${formatNaira(currentInst.overdueChargeKobo)}`}
                      labelColor={Colors.error}
                      valueColor={Colors.error}
                    />
                  ) : null}
                  {currentInst.amountPaidKobo > 0 ? (
                    <KeyValueRow
                      label="Already paid"
                      value={`−${formatNaira(currentInst.amountPaidKobo)}`}
                      labelColor={Colors.success}
                      valueColor={Colors.success}
                    />
                  ) : null}
                  <KeyValueRow label="Amount due" value={formatNaira(instalmentDue)} emphasis last />
                </View>

                <AppText variant="label" style={{ marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
                  How much would you like to pay?
                </AppText>
                <View style={styles.modeRow}>
                  <ModeOption
                    title="Full amount"
                    subtitle={formatNaira(instalmentDue)}
                    active={payMode === 'full'}
                    onPress={() => { setPayMode('full'); setAmountStr(''); }}
                  />
                  <ModeOption
                    title="Other amount"
                    subtitle="Part payment"
                    active={payMode === 'part'}
                    onPress={() => { setPayMode('part'); setAmountStr(''); }}
                  />
                </View>

                {payMode === 'part' ? (
                  <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: Spacing.md }}>
                    <AmountField
                      value={amountStr}
                      onChangeText={(t) => { setAmountStr(t.replace(/[^0-9.]/g, '')); setPayError(''); }}
                      autoFocus
                      error={amountStr !== '' && amountKobo > loanBalance ? 'This is more than your outstanding balance' : undefined}
                      hint={
                        amountStr !== '' && amountKobo >= instalmentDue
                          ? 'This covers the full instalment'
                          : `Up to ${formatNaira(loanBalance)}`
                      }
                    />
                  </Animated.View>
                ) : null}

                <AppButton
                  label={amountKobo > 0 ? `Continue · ${formatNaira(amountKobo)}` : 'Continue'}
                  onPress={() => setShowConfirm(true)}
                  disabled={!isValid}
                  style={{ marginTop: Spacing.lg }}
                />
              </Card>
            ) : (
              // ACTIVE loan but all instalments paid — balance may still be > 0 (e.g. rounding)
              <Card>
                <AppText variant="subheading">Settle remaining balance</AppText>
                <AppText variant="bodySmall" style={{ marginTop: 4 }}>
                  All instalments are paid. Clear the small remaining balance to close this loan.
                </AppText>
                <View style={styles.bill}>
                  <KeyValueRow label="Outstanding balance" value={formatNaira(loanBalance)} emphasis last />
                </View>
                <AppButton
                  label={`Pay ${formatNaira(loanBalance)}`}
                  onPress={() => payBalance('Loan fully paid off')}
                  loading={paying}
                  disabled={loanBalance <= 0}
                  style={{ marginTop: Spacing.lg }}
                />
              </Card>
            )
          ) : loan.status === 'PAID' ? (
            <EmptyState
              icon="trophy-outline"
              tone="success"
              title="Fully repaid"
              body="This loan is closed. Thank you for paying on time."
            />
          ) : (
            <Card>
              <Banner tone="warning" text="This loan is still in review. You can make an early payment if you'd like." />
              <View style={styles.bill}>
                <KeyValueRow label="Outstanding balance" value={formatNaira(loanBalance)} emphasis last />
              </View>
              <AppButton
                label={`Pay ${formatNaira(loanBalance)}`}
                onPress={() => payBalance('Payment recorded')}
                loading={paying}
                disabled={loanBalance <= 0}
                style={{ marginTop: Spacing.lg }}
              />
            </Card>
          )}

          <View style={{ marginTop: Spacing.xl }}>
            <SectionHeader title={`Payment history${repayments.length ? ` · ${repayments.length}` : ''}`} />
            {repayments.length === 0 ? (
              <EmptyState icon="receipt-outline" title="No payments yet" body="Your repayments on this loan will be listed here." />
            ) : (
              <Card padded={false}>
                {repayments.map((r, i) => (
                  <RepaymentRow key={r.id} item={r} last={i === repayments.length - 1} showReference />
                ))}
              </Card>
            )}
          </View>
        </View>
      </ScrollView>

      <ConfirmPaymentSheet
        visible={showConfirm}
        amountKobo={amountKobo}
        instalment={currentInst}
        balanceAfterKobo={loanBalance - amountKobo}
        isPartial={isPartial}
        onConfirm={handlePay}
        onCancel={() => setShowConfirm(false)}
        loading={paying}
      />
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <AppText variant="caption" color={Colors.ink.textFaint}>{label}</AppText>
      <AppText variant="label" tabular color={Colors.ink.text} numberOfLines={1} style={{ marginTop: 2, fontFamily: Fonts.bold }}>
        {value}
      </AppText>
    </View>
  );
}

function ModeOption({
  title,
  subtitle,
  active,
  onPress,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.mode, active && styles.modeActive]}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.radio, active && styles.radioActive]}>
        {active ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption" tabular style={{ marginTop: 1 }}>{subtitle}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  hero: {
    paddingHorizontal: Spacing.gutter,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  headerBar: { flexDirection: 'row', alignItems: 'center' },
  secure: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
    backgroundColor: Colors.ink.glass, borderWidth: 1, borderColor: Colors.ink.line,
  },
  heroStats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm + 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.ink.glass,
    borderWidth: 1,
    borderColor: Colors.ink.line,
  },
  heroDivider: { width: 1, backgroundColor: Colors.ink.line },
  body: { paddingHorizontal: Spacing.gutter, marginTop: Spacing.lg },
  bill: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  modeRow: { flexDirection: 'row', gap: Spacing.sm },
  mode: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    padding: Spacing.sm + 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  modeActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
});
