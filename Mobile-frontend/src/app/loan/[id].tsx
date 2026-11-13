import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import {
  Banner,
  Card,
  EmptyState,
  IconButton,
  InkSurface,
  KeyValueRow,
  ProgressBar,
  SegmentedControl,
  Skeleton,
  StatusPill,
} from '@/components/ui';
import { InstalmentTimeline, Money, RepaymentRow } from '@/components/loan';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { loanStatusMeta } from '@/constants/status';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { loanApi, type LoanDetail } from '@/RequestHandler/Request';
import { fmtDate, formatNaira, relativeDue } from '@/utils/format';

type Tab = 'overview' | 'schedule' | 'payments';

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useStatusBarStyle('light');
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError('');
    try {
      const detail = await loanApi.detail(id);
      setData(detail);
    } catch {
      setError('We couldn\'t load this loan. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const header = (title: string, subtitle?: string, right?: React.ReactNode) => (
    <View style={styles.headerBar}>
      <IconButton icon="chevron-back" variant="glass" onPress={() => router.back()} accessibilityLabel="Go back" />
      <View style={{ flex: 1, marginHorizontal: Spacing.sm + 4 }}>
        <AppText variant="label" color={Colors.ink.text} numberOfLines={1}>{title}</AppText>
        {subtitle ? <AppText variant="caption" color={Colors.ink.textMuted}>{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <InkSurface radius={0} style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
          {header('Loan details')}
          <Skeleton width={120} height={12} onInk style={{ marginTop: Spacing.xl }} />
          <Skeleton width={220} height={46} onInk style={{ marginTop: 12 }} />
          <Skeleton width="100%" height={56} onInk radius={14} style={{ marginTop: Spacing.lg }} />
        </InkSurface>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.container}>
        <InkSurface radius={0} style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
          {header('Loan details')}
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

  const { loan, schedule, repayments, stats } = data;
  const meta = loanStatusMeta(loan.status);
  const progress = stats.progressPct / 100;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ink.text} progressViewOffset={insets.top} />}
    >
      {/* ── Hero ── */}
      <InkSurface radius={0} style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
        {header(loan.purpose ?? 'Personal loan', `Opened ${fmtDate(loan.createdAt)}`, <StatusPill meta={meta} onInk />)}

        <View style={{ marginTop: Spacing.xl }}>
          <AppText variant="overline" color={Colors.ink.textMuted}>Remaining balance</AppText>
          <View style={{ marginTop: 6 }}>
            <Money kobo={loan.balanceKobo} size="xl" color={Colors.ink.text} fractionColor={Colors.ink.textFaint} />
          </View>
        </View>

        <View style={styles.heroProgress}>
          <ProgressBar value={progress} color={Colors.ink.accent} track={Colors.ink.glassStrong} height={4} style={{ flex: 1 }} />
          <AppText variant="caption" color={Colors.ink.textMuted} tabular>
            {stats.paidCount}/{stats.totalCount} paid
          </AppText>
        </View>

        <View style={styles.heroStats}>
          <HeroStat label="Borrowed" value={formatNaira(loan.principalKobo, { decimals: false })} />
          <View style={styles.heroDivider} />
          <HeroStat label="Monthly" value={formatNaira(loan.monthlyInstalmentKobo, { decimals: false })} />
          <View style={styles.heroDivider} />
          <HeroStat label="Rate" value={`${loan.interestRate}% p.a.`} />
        </View>
      </InkSurface>

      <View style={styles.body}>
        {/* ── Next due ── */}
        {stats.nextDue ? (
          <Card style={{ marginBottom: Spacing.md }}>
            <View style={styles.nextRow}>
              <View style={styles.nextIcon}>
                <Ionicons name="calendar" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="overline">Next payment</AppText>
                <AppText variant="label" style={{ marginTop: 2 }}>
                  {relativeDue(stats.nextDue.dueDate)} · {fmtDate(stats.nextDue.dueDate)}
                </AppText>
              </View>
              <Money kobo={stats.nextDue.outstandingKobo} size="sm" />
            </View>
            {loan.status === 'ACTIVE' ? (
              <AppButton label="Make a payment" onPress={() => router.push(`/repay/${loan.id}`)} style={{ marginTop: Spacing.md }} />
            ) : null}
          </Card>
        ) : null}

        {stats.overdueCount > 0 ? (
          <Banner
            tone="error"
            text={`${stats.overdueCount} instalment${stats.overdueCount > 1 ? 's are' : ' is'} overdue. Pay soon to limit fees.`}
            style={{ marginBottom: Spacing.md }}
          />
        ) : null}

        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'overview', label: 'Overview' },
            { key: 'schedule', label: `Schedule · ${stats.totalCount}` },
            { key: 'payments', label: `Payments · ${repayments.length}` },
          ]}
        />

        <Animated.View key={tab} entering={FadeIn.duration(220)} style={{ marginTop: Spacing.md, gap: Spacing.md }}>
          {tab === 'overview' ? (
            <>
              <Card>
                <AppText variant="subheading" style={{ marginBottom: Spacing.xs }}>Loan terms</AppText>
                <KeyValueRow label="Reference" value={loan.id.slice(0, 8).toUpperCase()} />
                <KeyValueRow label="Amount borrowed" value={formatNaira(loan.principalKobo)} />
                <KeyValueRow label="Interest rate" value={`${loan.interestRate}% per year`} />
                <KeyValueRow label="Term" value={`${loan.termMonths} months`} />
                <KeyValueRow label="Monthly payment" value={formatNaira(loan.monthlyInstalmentKobo)} />
                <KeyValueRow label="Total interest" value={formatNaira(loan.totalOwedKobo - loan.principalKobo)} />
                <KeyValueRow label="Total repayable" value={formatNaira(loan.totalOwedKobo)} />
                <KeyValueRow label="Disbursed" value={loan.disbursedAt ? fmtDate(loan.disbursedAt) : '—'} />
                <KeyValueRow label="Final payment" value={loan.dueAt ? fmtDate(loan.dueAt) : '—'} last />
              </Card>

              <Card>
                <AppText variant="subheading" style={{ marginBottom: Spacing.xs }}>Repayment progress</AppText>
                <KeyValueRow label="Total paid" value={formatNaira(stats.totalPaidKobo)} valueColor={Colors.success} />
                <KeyValueRow label="Remaining" value={formatNaira(loan.balanceKobo)} />
                <KeyValueRow label="Instalments paid" value={`${stats.paidCount} of ${stats.totalCount}`} />
                <KeyValueRow
                  label="Overdue"
                  value={stats.overdueCount > 0 ? String(stats.overdueCount) : 'None'}
                  valueColor={stats.overdueCount > 0 ? Colors.error : Colors.success}
                  last
                />
              </Card>
            </>
          ) : null}

          {tab === 'schedule' ? (
            schedule.length === 0 ? (
              <EmptyState icon="calendar-outline" title="No schedule yet" body="Your instalments appear once the loan is disbursed." />
            ) : (
              <InstalmentTimeline schedule={schedule} />
            )
          ) : null}

          {tab === 'payments' ? (
            repayments.length === 0 ? (
              <EmptyState icon="receipt-outline" title="No payments yet" body="Repayments on this loan will be listed here." />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  hero: {
    paddingHorizontal: Spacing.gutter,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  headerBar: { flexDirection: 'row', alignItems: 'center' },
  heroProgress: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4, marginTop: Spacing.md },
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
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 },
  nextIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
});
