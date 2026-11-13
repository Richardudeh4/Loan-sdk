import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Slider } from '@miblanchard/react-native-slider';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import {
  AmountField,
  Banner,
  Card,
  EmptyState,
  InkSurface,
  KeyValueRow,
  ProgressBar,
  ScreenHeader,
  SegmentedControl,
  Skeleton,
  StatusPill,
} from '@/components/ui';
import { Money } from '@/components/loan';
import { Colors, Spacing, Radius, Fonts, FontSize, Shadows } from '@/constants/theme';
import { loanStatusMeta } from '@/constants/status';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import {
  loanApi,
  ApiError,
  type LoanSummary,
  type InstalmentSummary,
  type LoanCalculationResult,
} from '@/RequestHandler/Request';
import { fmtDate, fmtDateShort, formatNaira, formatNairaCompact } from '@/utils/format';
import { toast } from 'sonner-native';

// ── Constants ─────────────────────────────────────────────────────────────────
const TERM_OPTIONS = [3, 6, 12, 18, 24];
const MIN_AMOUNT = 10_000; // ₦10,000
const MAX_AMOUNT = 5_000_000; // ₦5,000,000
const AMOUNT_STEP = 10_000;
const MIN_TERM = 3;
const MAX_TERM = 24;
const ANNUAL_RATE = 0.15;
const PURPOSE_SUGGESTIONS = ['Business', 'School fees', 'Rent', 'Medical', 'Travel'];

function calcInstalment(principal: number, termMonths: number): number {
  const r = ANNUAL_RATE / 12;
  const factor = Math.pow(1 + r, termMonths);
  return Math.round((principal * r * factor) / (factor - 1));
}

type Tab = 'calculator' | 'apply' | 'history';

// ── Loan Calculator ───────────────────────────────────────────────────────────
function LoanCalculator({ onApply }: { onApply: (amountNaira: number, termMonths: number) => void }) {
  const [amount, setAmount] = useState(100_000);
  const [term, setTerm] = useState(12);
  const [result, setResult] = useState<LoanCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCalc = useCallback((amt: number, t: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await loanApi.calculate(amt * 100, t);
        setResult(data);
      } catch {
        // silently ignore — local formula is the fallback
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  useEffect(() => { fetchCalc(amount, term); }, [amount, term, fetchCalc]);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Use server result only if it matches the current inputs; otherwise local formula
  const amountKobo = amount * 100;
  const fresh = result && result.amountKobo === amountKobo && result.termMonths === term ? result : null;
  const monthlyKobo = fresh?.monthlyInstalmentKobo ?? calcInstalment(amountKobo, term);
  const totalRepayKobo = fresh?.totalRepaymentKobo ?? monthlyKobo * term;
  const totalInterestKobo = fresh?.totalInterestKobo ?? totalRepayKobo - amountKobo;
  const rateLabel = fresh?.annualInterestRate ? `${fresh.annualInterestRate}%` : `${ANNUAL_RATE * 100}%`;

  return (
    <View style={{ gap: Spacing.md }}>
      <Card>
        <View style={styles.sliderHeader}>
          <AppText variant="overline">How much do you need?</AppText>
        </View>
        <AppText style={styles.bigValue} accessibilityLabel={`Amount ${formatNaira(amountKobo)}`}>
          ₦{amount.toLocaleString('en-NG')}
        </AppText>
        <Slider
          value={amount}
          minimumValue={MIN_AMOUNT}
          maximumValue={MAX_AMOUNT}
          step={AMOUNT_STEP}
          onValueChange={(v) => setAmount(Array.isArray(v) ? v[0] : v)}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.surfaceAlt}
          containerStyle={styles.sliderContainer}
          trackStyle={styles.track}
          thumbStyle={styles.thumb}
        />
        <View style={styles.sliderLabels}>
          <AppText variant="caption">{formatNairaCompact(MIN_AMOUNT)}</AppText>
          <AppText variant="caption">{formatNairaCompact(MAX_AMOUNT)}</AppText>
        </View>

        <View style={styles.calcDivider} />

        <AppText variant="overline">Over how long?</AppText>
        <View style={styles.termRow}>
          {TERM_OPTIONS.map((t) => {
            const active = term === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTerm(t)}
                style={[styles.termChip, active && styles.termChipActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <AppText style={[styles.termNum, active && { color: Colors.text.inverse }]}>{t}</AppText>
                <AppText variant="caption" color={active ? 'rgba(255,255,255,0.75)' : Colors.text.muted}>
                  months
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <Slider
          value={term}
          minimumValue={MIN_TERM}
          maximumValue={MAX_TERM}
          step={1}
          onValueChange={(v) => setTerm(Array.isArray(v) ? v[0] : v)}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.surfaceAlt}
          containerStyle={styles.sliderContainer}
          trackStyle={styles.track}
          thumbStyle={styles.thumb}
        />
        <View style={styles.sliderLabels}>
          <AppText variant="caption">{MIN_TERM} mo</AppText>
          <AppText variant="caption" color={Colors.text.primary} style={{ fontFamily: Fonts.semibold }}>
            {term} months
          </AppText>
          <AppText variant="caption">{MAX_TERM} mo</AppText>
        </View>
      </Card>

      {/* Results */}
      <InkSurface style={styles.results} glow="top-left">
        <View style={styles.resultsHead}>
          <AppText variant="overline" color={Colors.ink.textMuted}>Your monthly payment</AppText>
          {loading ? (
            <Animated.View entering={FadeIn}>
              <AppText variant="caption" color={Colors.ink.textFaint}>Updating…</AppText>
            </Animated.View>
          ) : null}
        </View>
        <View style={{ marginTop: 6 }}>
          <Money kobo={monthlyKobo} size="xl" color={Colors.ink.text} fractionColor={Colors.ink.textFaint} />
        </View>
        <AppText variant="bodySmall" color={Colors.ink.textMuted} style={{ marginTop: 4 }}>
          for {term} months · {rateLabel} annual rate
        </AppText>

        <View style={styles.ratio}>
          <View style={[styles.ratioPrincipal, { flex: Math.max(amountKobo, 1) }]} />
          <View style={[styles.ratioInterest, { flex: Math.max(totalInterestKobo, 1) }]} />
        </View>

        <View style={{ marginTop: Spacing.sm }}>
          <KeyValueRow onInk label="Principal" value={formatNaira(amountKobo)} />
          <KeyValueRow onInk label="Total interest" value={formatNaira(totalInterestKobo)} />
          <KeyValueRow onInk label="Total repayment" value={formatNaira(totalRepayKobo)} last />
        </View>

        <AppButton
          label="Apply with these terms"
          variant="inverse"
          onPress={() => onApply(amount, term)}
          style={{ marginTop: Spacing.lg }}
          rightIcon={<Ionicons name="arrow-forward" size={18} color={Colors.ink[800]} />}
        />
      </InkSurface>

      <AppText variant="caption" align="center" style={{ paddingHorizontal: Spacing.lg }}>
        Estimates only. Your final offer is confirmed before any funds are disbursed.
      </AppText>
    </View>
  );
}

// ── Apply form ────────────────────────────────────────────────────────────────
function ApplyForm({
  onSuccess,
  onViewLoans,
  prefillAmount,
  prefillTerm,
}: {
  onSuccess: () => void;
  onViewLoans: () => void;
  prefillAmount?: number;
  prefillTerm?: number;
}) {
  const [amountStr, setAmountStr] = useState(prefillAmount ? String(prefillAmount) : '');
  const [term, setTerm] = useState(prefillTerm ?? 12);
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (prefillAmount) setAmountStr(String(prefillAmount));
    if (prefillTerm) setTerm(prefillTerm);
  }, [prefillAmount, prefillTerm]);

  const amount = parseFloat(amountStr.replace(/,/g, '')) || 0;
  const amountKobo = Math.round(amount * 100);
  const instalment = amount >= MIN_AMOUNT ? calcInstalment(amountKobo, term) : 0;
  const totalOwed = instalment * term;
  const isValid = amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;

  const handleApply = async () => {
    if (!isValid) {
      setError(`Enter an amount between ₦${MIN_AMOUNT.toLocaleString()} and ₦${MAX_AMOUNT.toLocaleString()}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await loanApi.apply({
        amountKobo,
        termMonths: term,
        purpose: purpose.trim() || undefined,
      });
      toast.success('Application submitted');
      setSuccess(true);
      onSuccess();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card style={styles.successCard}>
        <Animated.View entering={ZoomIn.duration(400)} style={styles.successRing}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={30} color={Colors.text.inverse} />
          </View>
        </Animated.View>
        <AppText variant="title" align="center" style={{ marginTop: Spacing.lg }}>
          Application received
        </AppText>
        <AppText variant="bodySmall" align="center" style={{ marginTop: Spacing.sm, maxWidth: 280 }}>
          We're reviewing your request for {formatNaira(amountKobo, { decimals: false })} over {term} months. We'll let you know as soon as there's a decision.
        </AppText>
        <AppButton label="View my loans" variant="secondary" onPress={onViewLoans} style={{ marginTop: Spacing.lg }} />
      </Card>
    );
  }

  return (
    <Card>
      <AmountField
        label="Loan amount"
        value={amountStr}
        onChangeText={(t) => { setError(''); setAmountStr(t.replace(/[^0-9.]/g, '')); }}
        error={amountStr !== '' && !isValid ? `Choose between ₦${MIN_AMOUNT.toLocaleString()} and ₦${MAX_AMOUNT.toLocaleString()}` : undefined}
        hint={`Between ₦${MIN_AMOUNT.toLocaleString()} and ₦${MAX_AMOUNT.toLocaleString()}`}
      />

      <AppText variant="label" style={styles.fieldLabel}>Repayment term</AppText>
      <View style={styles.termRow}>
        {TERM_OPTIONS.map((t) => {
          const active = term === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTerm(t)}
              style={[styles.termChip, active && styles.termChipActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <AppText style={[styles.termNum, active && { color: Colors.text.inverse }]}>{t}</AppText>
              <AppText variant="caption" color={active ? 'rgba(255,255,255,0.75)' : Colors.text.muted}>
                months
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="label" style={styles.fieldLabel}>
        Purpose <AppText variant="caption">(optional)</AppText>
      </AppText>
      <TextInput
        style={styles.purposeInput}
        placeholder="What's the loan for?"
        placeholderTextColor={Colors.text.faint}
        selectionColor={Colors.primary}
        value={purpose}
        onChangeText={setPurpose}
        maxLength={100}
      />
      <View style={styles.suggestions}>
        {PURPOSE_SUGGESTIONS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPurpose(p)}
            style={[styles.suggestion, purpose === p && styles.suggestionActive]}
          >
            <AppText variant="caption" color={purpose === p ? Colors.primary : Colors.text.secondary} style={{ fontFamily: Fonts.semibold }}>
              {p}
            </AppText>
          </Pressable>
        ))}
      </View>

      {amount >= MIN_AMOUNT ? (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.summary}>
          <AppText variant="overline" style={{ marginBottom: 4 }}>Summary</AppText>
          <KeyValueRow label="Monthly payment" value={formatNaira(instalment)} />
          <KeyValueRow label="Total repayment" value={formatNaira(totalOwed)} />
          <KeyValueRow label="Interest rate" value={`${(ANNUAL_RATE * 100).toFixed(0)}% per year`} last />
        </Animated.View>
      ) : null}

      {error ? <Banner tone="error" text={error} style={{ marginTop: Spacing.md }} /> : null}

      <AppButton
        label="Submit application"
        onPress={handleApply}
        loading={loading}
        disabled={!isValid}
        style={{ marginTop: Spacing.lg }}
      />
    </Card>
  );
}

// ── Loan history card ─────────────────────────────────────────────────────────
function LoanHistoryCard({ loan, onPress }: { loan: LoanSummary; onPress: () => void }) {
  const [schedule, setSchedule] = useState<InstalmentSummary[]>([]);

  useEffect(() => {
    loanApi.schedule(loan.id).then(setSchedule).catch(() => {});
  }, [loan.id]);

  const progress = loan.totalOwedKobo > 0 ? 1 - loan.balanceKobo / loan.totalOwedKobo : 1;
  const pct = Math.min(100, Math.round(progress * 100));
  const paidCount = schedule.filter((i) => i.status === 'PAID').length;
  const totalCount = schedule.length;
  const meta = loanStatusMeta(loan.status);

  return (
    <Card onPress={onPress} style={{ marginBottom: Spacing.sm + 4 }} accessibilityLabel={`${loan.purpose ?? 'Personal loan'}, ${meta.label}`}>
      <View style={styles.historyHead}>
        <View style={{ flex: 1 }}>
          <AppText variant="label">{loan.purpose ?? 'Personal loan'}</AppText>
          <AppText variant="caption" style={{ marginTop: 2 }}>{fmtDate(loan.createdAt)}</AppText>
        </View>
        <StatusPill meta={meta} />
      </View>

      <View style={styles.historyFigures}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption">Remaining</AppText>
          <Money kobo={loan.balanceKobo} size="sm" />
        </View>
        <View style={styles.historyCol}>
          <AppText variant="caption">Borrowed</AppText>
          <AppText variant="label" tabular style={{ marginTop: 4 }}>{formatNaira(loan.principalKobo, { decimals: false })}</AppText>
        </View>
        <View style={styles.historyCol}>
          <AppText variant="caption">Monthly</AppText>
          <AppText variant="label" tabular style={{ marginTop: 4 }}>{formatNaira(loan.monthlyInstalmentKobo, { decimals: false })}</AppText>
        </View>
      </View>

      <ProgressBar value={progress} style={{ marginTop: Spacing.md }} color={loan.status === 'PAID' ? Colors.success : Colors.primary} />

      <View style={styles.historyFoot}>
        <AppText variant="caption">
          {totalCount > 0 ? `${paidCount} of ${totalCount} paid` : `${pct}% repaid`}
        </AppText>
        {loan.nextDue ? (
          <AppText variant="caption" color={Colors.primary} style={{ fontFamily: Fonts.semibold }}>
            Next {fmtDateShort(loan.nextDue.dueDate)} · {formatNaira(loan.nextDue.outstandingKobo, { decimals: false })}
          </AppText>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={Colors.text.faint} />
        )}
      </View>
    </Card>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function LoanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useStatusBarStyle('dark');
  const [tab, setTab] = useState<Tab>('calculator');
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>();
  const [prefillTerm, setPrefillTerm] = useState<number | undefined>();
  const [formKey, setFormKey] = useState(0);

  // Only jump to "My loans" on first load — never yank the user off a tab later.
  const load = useCallback(async (autoSwitch = false) => {
    try {
      const data = await loanApi.list();
      setLoans(data);
      if (autoSwitch && data.some((l) => l.status === 'ACTIVE' || l.status === 'PENDING')) {
        setTab('history');
      }
    } catch {
      // Silently ignore; stale data is fine
    } finally {
      setInitialLoad(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl * 2 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <ScreenHeader title="Loans" subtitle="Borrow with clarity" />

      <View style={styles.body}>
        <SegmentedControl<Tab>
          value={tab}
          onChange={(t) => {
            if (t === 'apply') setFormKey((k) => k + 1);
            setTab(t);
          }}
          options={[
            { key: 'calculator', label: 'Calculate' },
            { key: 'apply', label: 'Apply' },
            { key: 'history', label: loans.length ? `My loans · ${loans.length}` : 'My loans' },
          ]}
        />

        <Animated.View key={tab} entering={FadeIn.duration(220)} style={{ marginTop: Spacing.md }}>
          {tab === 'calculator' ? (
            <LoanCalculator
              onApply={(amt, tm) => {
                setPrefillAmount(amt);
                setPrefillTerm(tm);
                setFormKey((k) => k + 1);
                setTab('apply');
              }}
            />
          ) : null}

          {tab === 'apply' ? (
            <ApplyForm
              key={formKey}
              prefillAmount={prefillAmount}
              prefillTerm={prefillTerm}
              onSuccess={() => { load(); }}
              onViewLoans={() => setTab('history')}
            />
          ) : null}

          {tab === 'history' ? (
            initialLoad ? (
              <Card>
                <Skeleton width="50%" height={14} />
                <Skeleton width="35%" height={26} style={{ marginTop: 14 }} />
                <Skeleton width="100%" height={6} style={{ marginTop: 18 }} />
              </Card>
            ) : loans.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="No loans yet"
                body="When you apply, your applications and active loans will appear here."
                action={<AppButton label="Calculate a loan" variant="secondary" onPress={() => setTab('calculator')} />}
              />
            ) : (
              loans.map((l) => (
                <LoanHistoryCard key={l.id} loan={l} onPress={() => router.push(`/loan/${l.id}`)} />
              ))
            )
          ) : null}
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  body: { paddingHorizontal: Spacing.gutter },

  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bigValue: {
    fontFamily: Fonts.serif,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -0.8,
    color: Colors.text.primary,
    marginTop: 6,
  },
  sliderContainer: { marginTop: Spacing.sm, height: 36 },
  track: { height: 6, borderRadius: 3 },
  thumb: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.background,
    borderWidth: 6, borderColor: Colors.primary,
    ...Shadows.card, shadowOpacity: 0.15,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  calcDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderStrong, marginVertical: Spacing.lg },

  termRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm + 2 },
  termChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  termChipActive: { backgroundColor: Colors.ink[800], borderColor: Colors.ink[800] },
  termNum: { fontFamily: Fonts.serif, fontSize: 22, lineHeight: 26, color: Colors.text.primary },

  results: { padding: Spacing.gutter + 4, ...Shadows.float },
  resultsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratio: {
    flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden',
    marginTop: Spacing.lg, gap: 3,
  },
  ratioPrincipal: { backgroundColor: Colors.ink.accent, borderRadius: 3 },
  ratioInterest: { backgroundColor: 'rgba(141,184,247,0.35)', borderRadius: 3 },

  fieldLabel: { marginTop: Spacing.lg, marginBottom: Spacing.xs },
  purposeInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, minHeight: 52,
    backgroundColor: Colors.background,
    color: Colors.text.primary, fontSize: FontSize.md, fontFamily: Fonts.medium,
    marginTop: Spacing.xs,
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm + 2 },
  suggestion: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  suggestionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  summary: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xs,
    marginTop: Spacing.lg,
  },

  successCard: { alignItems: 'center', paddingVertical: Spacing.xl },
  successRing: { padding: 8, borderRadius: 50, backgroundColor: Colors.successLight },
  successIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
  },

  historyHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  historyFigures: { flexDirection: 'row', alignItems: 'flex-end', marginTop: Spacing.md, gap: Spacing.md },
  historyCol: { alignItems: 'flex-end' },
  historyFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
});
