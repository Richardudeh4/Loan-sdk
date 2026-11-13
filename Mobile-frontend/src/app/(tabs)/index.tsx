import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Card, EmptyState, IconButton, InkSurface, ProgressBar, SectionHeader, Skeleton, StatusPill } from '@/components/ui';
import { InstalmentDots, Money, RepaymentRow } from '@/components/loan';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { loanStatusMeta } from '@/constants/status';
import { useAuthStore } from '@/store/auth';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { loanApi, repaymentApi, type LoanSummary, type RepaymentSummary, type InstalmentSummary } from '@/RequestHandler/Request';
import { fmtDate, fmtDateShort, formatNaira, greeting, initials, relativeDue, daysUntil } from '@/utils/format';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  useStatusBarStyle('light');

  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [recentRepayments, setRecentRepayments] = useState<RepaymentSummary[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<InstalmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [loansData, repData] = await Promise.all([loanApi.list(), repaymentApi.listAll()]);
      setLoans(loansData);
      setRecentRepayments(repData.slice(0, 5));
      const active = loansData.find((l) => l.status === 'ACTIVE');
      if (active) {
        const sched = await loanApi.schedule(active.id);
        setActiveSchedule(sched);
      } else {
        setActiveSchedule([]);
      }
    } catch {
      // Silently fail on refresh — stale data is better than a crash
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
  const activeLoan = activeLoans[0];
  const pendingLoan = loans.find((l) => l.status === 'PENDING');
  const totalBalance = activeLoans.reduce((s, l) => s + l.balanceKobo, 0);
  const paidLoans = loans.filter((l) => l.status === 'PAID').length;

  const displayName = user?.firstName ?? null;
  const fullName = user?.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : null;
  const nextDue = activeLoan?.nextDue ?? null;
  const dueDays = daysUntil(nextDue?.dueDate);
  const dueUrgent = dueDays !== null && dueDays <= 3;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl * 2 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ink.text} progressViewOffset={insets.top} />}
      >
        {/* ── Hero ── */}
        <InkSurface radius={0} style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={styles.heroTop}>
            <Pressable
              onPress={() => router.push('/(tabs)/Settings')}
              style={styles.identity}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <AppText style={styles.avatarText}>{initials(fullName, user?.phone)}</AppText>
                </View>
              )}
              <View>
                <AppText variant="caption" color={Colors.ink.textMuted}>{greeting()}</AppText>
                <AppText variant="subheading" color={Colors.ink.text} numberOfLines={1}>
                  {displayName ?? 'Welcome'}
                </AppText>
              </View>
            </Pressable>
            <IconButton
              icon="notifications-outline"
              variant="glass"
              accessibilityLabel="Notifications"
              onPress={() => {}}
            />
          </View>

          <View style={styles.balanceBlock}>
            <AppText variant="overline" color={Colors.ink.textMuted}>Outstanding balance</AppText>
            {loading ? (
              <Skeleton width={220} height={48} onInk style={{ marginTop: 10 }} />
            ) : (
              <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 6 }}>
                <Money kobo={totalBalance} size="xl" color={Colors.ink.text} fractionColor={Colors.ink.textFaint} />
              </Animated.View>
            )}
            {!loading && activeLoan ? (
              <View style={styles.heroMeta}>
                <ProgressBar
                  value={activeLoan.totalOwedKobo > 0 ? 1 - activeLoan.balanceKobo / activeLoan.totalOwedKobo : 0}
                  color={Colors.ink.accent}
                  track={Colors.ink.glassStrong}
                  height={4}
                  style={{ flex: 1 }}
                />
                <AppText variant="caption" color={Colors.ink.textMuted} tabular>
                  {Math.round((activeLoan.totalOwedKobo > 0 ? 1 - activeLoan.balanceKobo / activeLoan.totalOwedKobo : 0) * 100)}% repaid
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <HeroStat label="Active" value={loading ? '—' : String(activeLoans.length)} />
            <View style={styles.statDivider} />
            <HeroStat label="Paid off" value={loading ? '—' : String(paidLoans)} />
            <View style={styles.statDivider} />
            <HeroStat
              label="Monthly"
              value={loading || !activeLoan ? '—' : formatNaira(activeLoan.monthlyInstalmentKobo, { decimals: false })}
            />
          </View>
        </InkSurface>

        {/* ── Quick actions ── */}
        <View style={styles.actions}>
          <QuickAction icon="add" label="Borrow" onPress={() => router.push('/(tabs)/Loan')} primary />
          <QuickAction icon="arrow-up" label="Repay" onPress={() => router.push('/(tabs)/Repay')} />
          <QuickAction icon="calendar-outline" label="Schedule" onPress={() => router.push('/(tabs)/Repay')} />
          <QuickAction icon="person-outline" label="Profile" onPress={() => router.push('/(tabs)/Settings')} />
        </View>

        {/* ── Next payment ── */}
        {!loading && activeLoan && nextDue ? (
          <Animated.View entering={FadeInDown.duration(400).delay(60)} style={styles.section}>
            <Card style={dueUrgent ? styles.dueCardUrgent : undefined}>
              <View style={styles.dueHead}>
                <View style={[styles.dueIcon, dueUrgent && { backgroundColor: Colors.warningLight }]}>
                  <Ionicons name="calendar" size={18} color={dueUrgent ? Colors.warning : Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="overline">Next payment</AppText>
                  <AppText variant="label" color={dueUrgent ? Colors.warning : Colors.text.primary}>
                    {relativeDue(nextDue.dueDate)} · {fmtDateShort(nextDue.dueDate)}
                  </AppText>
                </View>
                <Money kobo={nextDue.outstandingKobo} size="sm" />
              </View>

              {activeSchedule.length > 0 ? (
                <View style={styles.dueSchedule}>
                  <View style={styles.dueScheduleHead}>
                    <AppText variant="caption">
                      Instalment {nextDue.instalmentNumber} of {activeSchedule.length}
                    </AppText>
                    <AppText variant="caption" color={Colors.success} style={{ fontFamily: Fonts.semibold }}>
                      {activeSchedule.filter((i) => i.status === 'PAID').length} paid
                    </AppText>
                  </View>
                  <InstalmentDots instalments={activeSchedule} />
                </View>
              ) : null}

              <AppButton
                label="Pay now"
                onPress={() => router.push(`/repay/${activeLoan.id}`)}
                style={{ marginTop: Spacing.md }}
              />
            </Card>
          </Animated.View>
        ) : null}

        {/* ── Pending application ── */}
        {!loading && pendingLoan ? (
          <View style={styles.section}>
            <Card onPress={() => router.push(`/loan/${pendingLoan.id}`)} accessibilityLabel="View pending application">
              <View style={styles.pendingRow}>
                <View style={[styles.dueIcon, { backgroundColor: Colors.warningLight }]}>
                  <Ionicons name="hourglass-outline" size={18} color={Colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="label">Application in review</AppText>
                  <AppText variant="caption" style={{ marginTop: 2 }}>
                    {formatNaira(pendingLoan.principalKobo, { decimals: false })} · {pendingLoan.termMonths} months · submitted {fmtDateShort(pendingLoan.createdAt)}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.text.faint} />
              </View>
            </Card>
          </View>
        ) : null}

        {/* ── Active loan ── */}
        {loading ? (
          <View style={styles.section}>
            <Card>
              <Skeleton width="40%" height={14} />
              <Skeleton width="70%" height={28} style={{ marginTop: 12 }} />
              <Skeleton width="100%" height={6} style={{ marginTop: 18 }} />
            </Card>
          </View>
        ) : activeLoan ? (
          <View style={styles.section}>
            <SectionHeader title="Active loan" action={{ label: 'Details', onPress: () => router.push(`/loan/${activeLoan.id}`) }} />
            <LoanCard loan={activeLoan} onPress={() => router.push(`/loan/${activeLoan.id}`)} />
          </View>
        ) : null}

        {/* ── No loan CTA ── */}
        {!loading && loans.length === 0 ? (
          <View style={styles.section}>
            <EmptyState
              icon="sparkles-outline"
              title="Start with a quick quote"
              body="See your monthly payment before you apply. It takes less than a minute and won't affect anything."
              action={<AppButton label="Calculate a loan" onPress={() => router.push('/(tabs)/Loan')} />}
            />
          </View>
        ) : null}

        {/* ── Recent payments ── */}
        {recentRepayments.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Recent activity" action={{ label: 'See all', onPress: () => router.push('/(tabs)/Repay') }} />
            <Card padded={false}>
              {recentRepayments.map((r, i) => (
                <RepaymentRow key={r.id} item={r} last={i === recentRepayments.length - 1} />
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <AppText variant="caption" color={Colors.ink.textFaint}>{label}</AppText>
      <AppText variant="label" color={Colors.ink.text} tabular numberOfLines={1} style={{ marginTop: 2, fontFamily: Fonts.bold }}>
        {value}
      </AppText>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.qa, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.qaIcon, primary && styles.qaIconPrimary]}>
        <Ionicons name={icon} size={22} color={primary ? Colors.text.inverse : Colors.text.primary} />
      </View>
      <AppText variant="caption" color={Colors.text.primary} style={{ fontFamily: Fonts.semibold }}>
        {label}
      </AppText>
    </Pressable>
  );
}

function LoanCard({ loan, onPress }: { loan: LoanSummary; onPress: () => void }) {
  const progress = loan.totalOwedKobo > 0 ? 1 - loan.balanceKobo / loan.totalOwedKobo : 1;
  return (
    <Card onPress={onPress} accessibilityLabel="View loan details">
      <View style={styles.loanHead}>
        <View style={styles.loanIcon}>
          <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label">{loan.purpose ?? 'Personal loan'}</AppText>
          <AppText variant="caption" style={{ marginTop: 2 }}>
            Opened {fmtDate(loan.createdAt)}
          </AppText>
        </View>
        <StatusPill meta={loanStatusMeta(loan.status)} />
      </View>

      <View style={styles.loanFigures}>
        <View>
          <AppText variant="caption">Remaining</AppText>
          <Money kobo={loan.balanceKobo} size="md" />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="caption">Borrowed</AppText>
          <AppText variant="label" tabular style={{ marginTop: 6 }}>
            {formatNaira(loan.principalKobo)}
          </AppText>
        </View>
      </View>

      <ProgressBar value={progress} style={{ marginTop: Spacing.md }} />
      <View style={styles.loanFoot}>
        <AppText variant="caption" tabular>{Math.round(progress * 100)}% repaid</AppText>
        <AppText variant="caption">
          {loan.termMonths} months · {loan.interestRate}% p.a.
        </AppText>
      </View>
    </Card>
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
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4, flexShrink: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    backgroundColor: Colors.ink.glassStrong,
    borderWidth: 1, borderColor: Colors.ink.line,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.ink.text },

  balanceBlock: { marginTop: Spacing.xl },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4, marginTop: Spacing.md },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm + 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.ink.glass,
    borderWidth: 1,
    borderColor: Colors.ink.line,
    gap: Spacing.md,
  },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.ink.line },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    marginTop: Spacing.lg,
  },
  qa: { alignItems: 'center', gap: Spacing.sm, width: 72 },
  qaIcon: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qaIconPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  section: { marginTop: Spacing.lg, paddingHorizontal: Spacing.gutter },

  dueCardUrgent: { borderColor: '#F6D9AE' },
  dueHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 },
  dueIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  dueSchedule: {
    marginTop: Spacing.md,
    padding: Spacing.sm + 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  dueScheduleHead: { flexDirection: 'row', justifyContent: 'space-between' },

  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 },

  loanHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 },
  loanIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  loanFigures: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: Spacing.md + 4 },
  loanFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
});
