import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import {
  AmountField,
  Banner,
  Card,
  EmptyState,
  InkSurface,
  KeyValueRow,
  ScreenHeader,
  SegmentedControl,
  Skeleton,
} from '@/components/ui';
import { ConfirmPaymentSheet, InstalmentDots, InstalmentTimeline, Money, RepaymentRow } from '@/components/loan';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import {
  loanApi,
  repaymentApi,
  ApiError,
  type LoanSummary,
  type InstalmentSummary,
  type RepaymentSummary,
} from '@/RequestHandler/Request';
import { fmtDate, fmtDateShort, formatNaira, relativeDue, uuid } from '@/utils/format';
import { toast } from 'sonner-native';

type Tab = 'schedule' | 'pay' | 'history';

export default function RepayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useStatusBarStyle('dark');
  const [tab, setTab] = useState<Tab>('schedule');

  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanSummary | null>(null);
  const [schedule, setSchedule] = useState<InstalmentSummary[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [repayments, setRepayments] = useState<RepaymentSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const [amountStr, setAmountStr] = useState('');
  const [payMode, setPayMode] = useState<'full' | 'part'>('full');
  const [showConfirm, setShowConfirm] = useState(false);
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadSchedule = async (loanId: string) => {
    setScheduleLoading(true);
    setScheduleError('');
    try {
      const sched = await loanApi.schedule(loanId);
      setSchedule(sched);
    } catch {
      setScheduleError('We couldn\'t load your schedule. Pull down to retry.');
      setSchedule([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  const load = useCallback(async (loanId?: string) => {
    try {
      const [loansData, repData] = await Promise.all([loanApi.list(), repaymentApi.listAll()]);
      const active = loansData.filter((l) => l.status === 'ACTIVE' || l.status === 'PENDING');
      setLoans(active);
      setRepayments(repData);

      const pick = loanId
        ? active.find((l) => l.id === loanId)
        : active.find((l) => l.status === 'ACTIVE') ?? active[0];

      if (pick) {
        setSelectedLoan(pick);
        await loadSchedule(pick.id);
      } else {
        setSelectedLoan(null);
        setSchedule([]);
      }
    } catch {
      // ignore on refresh
    } finally {
      setRefreshing(false);
      setInitialLoad(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchLoan = async (loan: LoanSummary) => {
    setSelectedLoan(loan);
    setAmountStr('');
    setPayMode('full');
    await loadSchedule(loan.id);
  };

  const onRefresh = useCallback(() => { setRefreshing(true); load(selectedLoan?.id); }, [load, selectedLoan]);

  // Earliest unpaid instalment is the current bill
  const currentInst =
    schedule.find((i) => i.status === 'PENDING' || i.status === 'PARTIAL' || i.status === 'OVERDUE') ?? null;

  const instalmentDue = currentInst
    ? currentInst.totalDueKobo + currentInst.overdueChargeKobo - currentInst.amountPaidKobo
    : 0;

  const amount = parseFloat(amountStr.replace(/,/g, '')) || 0;
  const amountKobo = payMode === 'full' ? instalmentDue : Math.round(amount * 100);
  const isPartial = payMode === 'part' && amountKobo < instalmentDue;
  const exceedsBalance = amountKobo > (selectedLoan?.balanceKobo ?? 0);

  const isValid =
    selectedLoan?.status === 'ACTIVE' &&
    currentInst !== null &&
    amountKobo >= 100 &&
    !exceedsBalance;

  const handlePay = async () => {
    if (!selectedLoan || !isValid) return;
    setPaying(true);
    setErrorMsg('');
    try {
      await loanApi.repay(selectedLoan.id, { amountKobo, reference: uuid() });
      setShowConfirm(false);
      setAmountStr('');
      setPayMode('full');
      toast.success(`Payment of ${formatNaira(amountKobo)} received`);
      await load(selectedLoan.id);
      setTab('schedule');
    } catch (err) {
      setShowConfirm(false);
      const msg = err instanceof ApiError ? err.message : 'Payment failed. Please try again.';
      toast.error(msg);
      setErrorMsg(msg);
    } finally {
      setPaying(false);
    }
  };

  const paidCount = schedule.filter((i) => i.status === 'PAID').length;
  const totalCount = schedule.length;
  const totalPaid = repayments.filter((r) => r.status === 'SUCCESS').reduce((s, r) => s + r.amountKobo, 0);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.canvas }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl * 2 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <ScreenHeader title="Repayments" subtitle="Stay on schedule" />

        <View style={styles.body}>
          {/* ── Summary ── */}
          <InkSurface style={styles.summary}>
            <View style={styles.summaryTop}>
              <View style={{ flex: 1 }}>
                <AppText variant="overline" color={Colors.ink.textMuted}>
                  {currentInst ? 'Due next' : 'Total repaid'}
                </AppText>
                {initialLoad ? (
                  <Skeleton width={160} height={36} onInk style={{ marginTop: 8 }} />
                ) : (
                  <View style={{ marginTop: 4 }}>
                    <Money
                      kobo={currentInst ? instalmentDue : totalPaid}
                      size="lg"
                      color={Colors.ink.text}
                      fractionColor={Colors.ink.textFaint}
                    />
                  </View>
                )}
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
              {currentInst && selectedLoan?.status === 'ACTIVE' ? (
                <AppButton
                  label="Pay"
                  size="sm"
                  variant="inverse"
                  fullWidth={false}
                  onPress={() => setTab('pay')}
                />
              ) : null}
            </View>

            {schedule.length > 0 ? (
              <View style={styles.summaryDots}>
                <InstalmentDots instalments={schedule} onInk />
              </View>
            ) : null}

            <View style={styles.summaryStats}>
              <SummaryStat label="Total repaid" value={formatNaira(totalPaid, { decimals: false })} />
              <View style={styles.statDivider} />
              <SummaryStat label="Instalments" value={totalCount ? `${paidCount} of ${totalCount}` : '—'} />
              <View style={styles.statDivider} />
              <SummaryStat label="Balance" value={selectedLoan ? formatNaira(selectedLoan.balanceKobo, { decimals: false }) : '—'} />
            </View>
          </InkSurface>

          {/* ── Loan selector ── */}
          {loans.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: Spacing.md, marginHorizontal: -Spacing.gutter }}
              contentContainerStyle={{ paddingHorizontal: Spacing.gutter, gap: Spacing.sm }}
            >
              {loans.map((l) => {
                const active = selectedLoan?.id === l.id;
                return (
                  <Pressable
                    key={l.id}
                    style={[styles.loanChip, active && styles.loanChipActive]}
                    onPress={() => switchLoan(l)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <AppText variant="caption" color={active ? Colors.ink.textMuted : Colors.text.muted}>
                      {l.purpose ?? 'Personal'}
                    </AppText>
                    <AppText variant="label" tabular color={active ? Colors.ink.text : Colors.text.primary}>
                      {formatNaira(l.balanceKobo, { decimals: false })}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <SegmentedControl<Tab>
            value={tab}
            onChange={setTab}
            style={{ marginTop: Spacing.md }}
            options={[
              { key: 'schedule', label: 'Schedule' },
              { key: 'pay', label: 'Make payment' },
              { key: 'history', label: 'History' },
            ]}
          />

          <Animated.View key={tab} entering={FadeIn.duration(220)} style={{ marginTop: Spacing.md }}>
            {/* ── Schedule ── */}
            {tab === 'schedule' ? (
              scheduleLoading || initialLoad ? (
                <View style={{ gap: Spacing.sm + 2 }}>
                  {[0, 1, 2].map((i) => (
                    <Card key={i}>
                      <Skeleton width="30%" height={10} />
                      <Skeleton width="55%" height={16} style={{ marginTop: 8 }} />
                    </Card>
                  ))}
                </View>
              ) : scheduleError ? (
                <EmptyState icon="cloud-offline-outline" tone="error" title="Couldn't load schedule" body={scheduleError} />
              ) : loans.length === 0 ? (
                <EmptyState
                  icon="checkmark-done"
                  tone="success"
                  title="Nothing to repay"
                  body="You have no active loans. When you borrow, your repayment schedule will live here."
                  action={<AppButton label="Explore loans" variant="secondary" onPress={() => router.push('/(tabs)/Loan')} />}
                />
              ) : schedule.length === 0 ? (
                <EmptyState
                  icon="hourglass-outline"
                  tone="warning"
                  title="Schedule coming soon"
                  body="Your instalment schedule will appear here as soon as your loan is approved."
                />
              ) : (
                <InstalmentTimeline schedule={schedule} />
              )
            ) : null}

            {/* ── Pay ── */}
            {tab === 'pay' ? (
              selectedLoan?.status === 'PENDING' ? (
                <EmptyState
                  icon="hourglass-outline"
                  tone="warning"
                  title="Loan in review"
                  body="Payments open as soon as your loan is approved and disbursed."
                />
              ) : !currentInst ? (
                <EmptyState
                  icon="checkmark-done"
                  tone="success"
                  title="You're all paid up"
                  body="There's nothing due right now. Nice work."
                />
              ) : (
                <Card>
                  <View style={styles.billHead}>
                    <View>
                      <AppText variant="overline">Current bill</AppText>
                      <AppText variant="label" style={{ marginTop: 2 }}>
                        Instalment {currentInst.instalmentNumber} · due {fmtDateShort(currentInst.dueDate)}
                      </AppText>
                    </View>
                    {currentInst.status === 'OVERDUE' ? (
                      <View style={styles.overdueTag}>
                        <AppText variant="caption" color={Colors.error} style={{ fontFamily: Fonts.bold }}>Overdue</AppText>
                      </View>
                    ) : null}
                  </View>

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
                        onChangeText={(t) => { setAmountStr(t.replace(/[^0-9.]/g, '')); setErrorMsg(''); }}
                        autoFocus
                        error={amountStr !== '' && exceedsBalance ? 'This is more than your outstanding balance' : undefined}
                        hint={
                          amountStr !== '' && amountKobo >= instalmentDue
                            ? 'This covers the full instalment'
                            : `Up to ${formatNaira(selectedLoan?.balanceKobo ?? 0)}`
                        }
                      />
                    </Animated.View>
                  ) : null}

                  {errorMsg ? <Banner tone="error" text={errorMsg} style={{ marginTop: Spacing.md }} /> : null}

                  <AppButton
                    label={amountKobo > 0 ? `Continue · ${formatNaira(amountKobo)}` : 'Continue'}
                    onPress={() => setShowConfirm(true)}
                    disabled={!isValid}
                    style={{ marginTop: Spacing.lg }}
                  />
                </Card>
              )
            ) : null}

            {/* ── History ── */}
            {tab === 'history' ? (
              repayments.length === 0 ? (
                <EmptyState icon="receipt-outline" title="No payments yet" body="Every repayment you make will be listed here." />
              ) : (
                <Card padded={false}>
                  {repayments.map((r, i) => (
                    <RepaymentRow key={r.id} item={r} last={i === repayments.length - 1} showReference />
                  ))}
                </Card>
              )
            ) : null}
          </Animated.View>
        </View>
      </ScrollView>

      <ConfirmPaymentSheet
        visible={showConfirm}
        instalment={currentInst}
        amountKobo={amountKobo}
        isPartial={isPartial}
        balanceAfterKobo={(selectedLoan?.balanceKobo ?? 0) - amountKobo}
        onConfirm={handlePay}
        onCancel={() => setShowConfirm(false)}
        loading={paying}
      />
    </View>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
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
  body: { paddingHorizontal: Spacing.gutter },

  summary: { padding: Spacing.gutter },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  summaryDots: { marginTop: Spacing.md },
  summaryStats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.ink.line,
  },
  statDivider: { width: 1, backgroundColor: Colors.ink.line },

  loanChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    minWidth: 120,
  },
  loanChipActive: { backgroundColor: Colors.ink[800], borderColor: Colors.ink[800] },

  billHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  overdueTag: { backgroundColor: Colors.errorLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
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
