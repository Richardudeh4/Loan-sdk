/**
 * Loan-domain components shared across Home, Loans, Repay and detail screens.
 */
import React from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Colors, Radius, Spacing, Fonts, Shadows } from '@/constants/theme';
import { instalmentStatusMeta } from '@/constants/status';
import type { InstalmentSummary, RepaymentSummary } from '@/RequestHandler/Request';
import { fmtDate, fmtDateTime, formatNaira, splitNaira } from '@/utils/format';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { Banner, KeyValueRow, ProgressBar } from './ui';

// ── Money: serif amount with de-emphasised kobo ───────────────────────────────
export function Money({
  kobo,
  size = 'md',
  color,
  fractionColor,
}: {
  kobo: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  fractionColor?: string;
}) {
  const { whole, fraction } = splitNaira(kobo);
  const fs = size === 'xl' ? 50 : size === 'lg' ? 38 : size === 'md' ? 28 : 22;
  const c = color ?? Colors.text.primary;
  return (
    <AppText
      style={{ fontFamily: Fonts.serif, fontSize: fs, lineHeight: fs * 1.12, letterSpacing: -fs * 0.02, color: c }}
      numberOfLines={1}
      adjustsFontSizeToFit
      accessibilityLabel={formatNaira(kobo)}
    >
      {whole}
      <AppText style={{ fontFamily: Fonts.serif, fontSize: fs * 0.62, color: fractionColor ?? c, opacity: fractionColor ? 1 : 0.5 }}>
        {fraction}
      </AppText>
    </AppText>
  );
}

// ── Instalment dot strip ──────────────────────────────────────────────────────
export function InstalmentDots({
  instalments,
  onInk = false,
  max = 24,
}: {
  instalments: InstalmentSummary[];
  onInk?: boolean;
  max?: number;
}) {
  return (
    <View style={styles.dots} accessibilityLabel={`${instalments.filter((i) => i.status === 'PAID').length} of ${instalments.length} instalments paid`}>
      {instalments.slice(0, max).map((inst) => {
        const meta = instalmentStatusMeta(inst.status);
        const pending = inst.status === 'PENDING';
        return (
          <View
            key={inst.id}
            style={[
              styles.dot,
              pending
                ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: onInk ? Colors.ink.textFaint : Colors.borderStrong }
                : { backgroundColor: inst.status === 'PAID' && onInk ? Colors.ink.accent : meta.color },
            ]}
          />
        );
      })}
    </View>
  );
}

// ── Instalment timeline ───────────────────────────────────────────────────────
export function InstalmentTimeline({ schedule }: { schedule: InstalmentSummary[] }) {
  const currentIdx = schedule.findIndex(
    (i) => i.status === 'PENDING' || i.status === 'PARTIAL' || i.status === 'OVERDUE',
  );
  return (
    <View>
      {schedule.map((inst, idx) => (
        <InstalmentRow
          key={inst.id}
          inst={inst}
          total={schedule.length}
          isLast={idx === schedule.length - 1}
          isCurrent={idx === currentIdx}
        />
      ))}
    </View>
  );
}

function InstalmentRow({
  inst,
  total,
  isLast,
  isCurrent,
}: {
  inst: InstalmentSummary;
  total: number;
  isLast: boolean;
  isCurrent: boolean;
}) {
  const meta = instalmentStatusMeta(inst.status);
  const gross = inst.totalDueKobo + inst.overdueChargeKobo;
  const progress = gross > 0 ? inst.amountPaidKobo / gross : 0;
  const isPaid = inst.status === 'PAID';
  const pending = inst.status === 'PENDING';

  return (
    <View style={styles.tlRow}>
      <View style={styles.tlSpine}>
        {!isLast ? (
          <View style={[styles.tlLine, isPaid && { backgroundColor: Colors.success, opacity: 0.35 }]} />
        ) : null}
        <View
          style={[
            styles.tlNode,
            pending
              ? { backgroundColor: Colors.background, borderColor: isCurrent ? Colors.primary : Colors.borderStrong }
              : { backgroundColor: meta.color, borderColor: meta.color },
          ]}
        >
          {pending ? (
            isCurrent ? <View style={styles.tlNodeInner} /> : null
          ) : (
            <Ionicons name={meta.icon} size={11} color={Colors.text.inverse} />
          )}
        </View>
      </View>

      <View style={[styles.tlCard, isCurrent && styles.tlCardCurrent]}>
        <View style={styles.tlHead}>
          <View style={{ flex: 1 }}>
            <AppText variant="overline" color={isCurrent ? Colors.primary : Colors.text.muted}>
              {isCurrent ? 'Up next · ' : ''}
              {inst.instalmentNumber} of {total}
            </AppText>
            <AppText variant="label" style={{ marginTop: 2 }}>
              {fmtDate(inst.dueDate)}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="subheading" tabular color={isPaid ? Colors.success : Colors.text.primary}>
              {formatNaira(isPaid ? inst.amountPaidKobo : inst.outstandingKobo)}
            </AppText>
            <AppText variant="caption" color={meta.color} style={{ fontFamily: Fonts.semibold }}>
              {meta.label}
            </AppText>
          </View>
        </View>

        {inst.overdueChargeKobo > 0 ? (
          <View style={styles.tlNote}>
            <Ionicons name="alert-circle" size={13} color={Colors.error} />
            <AppText variant="caption" color={Colors.error}>
              Includes {formatNaira(inst.overdueChargeKobo)} overdue fee
            </AppText>
          </View>
        ) : null}

        {isPaid && inst.paidAt ? (
          <AppText variant="caption" style={{ marginTop: 6 }}>
            Paid {fmtDate(inst.paidAt)}
          </AppText>
        ) : null}

        {inst.status === 'PARTIAL' ? (
          <View style={{ marginTop: Spacing.sm + 2 }}>
            <ProgressBar value={progress} color={Colors.warning} height={4} />
            <AppText variant="caption" style={{ marginTop: 6 }}>
              {formatNaira(inst.amountPaidKobo)} paid · {formatNaira(inst.outstandingKobo)} left
            </AppText>
          </View>
        ) : null}

        {inst.status === 'ROLLED_OVER' ? (
          <AppText variant="caption" color={Colors.violet} style={{ marginTop: 6 }}>
            Missed — carried into the next instalment
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

// ── Repayment / transaction row ───────────────────────────────────────────────
export function RepaymentRow({
  item,
  last = false,
  showReference = false,
  title = 'Loan repayment',
}: {
  item: RepaymentSummary;
  last?: boolean;
  showReference?: boolean;
  title?: string;
}) {
  const ok = item.status === 'SUCCESS';
  const pending = item.status === 'PENDING';
  const color = ok ? Colors.success : pending ? Colors.warning : Colors.error;
  const bg = ok ? Colors.successLight : pending ? Colors.warningLight : Colors.errorLight;
  const icon = ok ? 'arrow-up' : pending ? 'time-outline' : 'close';

  return (
    <View style={[styles.txRow, !last && styles.txDivider]}>
      <View style={[styles.txIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} style={ok ? { transform: [{ rotate: '45deg' }] } : undefined} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption" style={{ marginTop: 2 }}>
          {fmtDateTime(item.paidAt ?? item.createdAt)}
        </AppText>
        {showReference ? (
          <AppText variant="caption" color={Colors.text.faint} numberOfLines={1} style={{ marginTop: 1 }}>
            Ref {item.reference.slice(0, 13).toUpperCase()}
          </AppText>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="label" tabular color={ok ? Colors.text.primary : color}>
          {formatNaira(item.amountKobo)}
        </AppText>
        {!ok ? (
          <AppText variant="caption" color={color} style={{ marginTop: 2, fontFamily: Fonts.semibold }}>
            {pending ? 'Processing' : 'Failed'}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

// ── Confirm payment sheet ─────────────────────────────────────────────────────
export function ConfirmPaymentSheet({
  visible,
  amountKobo,
  balanceAfterKobo,
  isPartial,
  instalment,
  onConfirm,
  onCancel,
  loading,
}: {
  visible: boolean;
  amountKobo: number;
  balanceAfterKobo: number;
  isPartial: boolean;
  instalment?: InstalmentSummary | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      // Android back button: don't let it dismiss the sheet mid-payment
      onRequestClose={loading ? () => {} : onCancel}
    >
      {visible ? (
        <View style={{ flex: 1 }}>
          <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
            <Pressable style={styles.overlay} onPress={loading ? undefined : onCancel} accessibilityLabel="Dismiss" />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.duration(320)}
            style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}
          >
            <View style={styles.grabber} />
            <View style={styles.sheetIcon}>
              <Ionicons name="shield-checkmark" size={22} color={Colors.primary} />
            </View>
            <AppText variant="overline" align="center" style={{ marginTop: Spacing.md }}>
              Confirm {isPartial ? 'part ' : ''}payment
            </AppText>
            <View style={{ alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
              <Money kobo={amountKobo} size="lg" />
            </View>

            <View style={styles.sheetBody}>
              {instalment ? (
                <KeyValueRow
                  label="Instalment"
                  value={`#${instalment.instalmentNumber} · due ${fmtDate(instalment.dueDate)}`}
                />
              ) : null}
              {instalment && instalment.overdueChargeKobo > 0 ? (
                <KeyValueRow
                  label="Overdue fee included"
                  value={`+${formatNaira(instalment.overdueChargeKobo)}`}
                  labelColor={Colors.error}
                  valueColor={Colors.error}
                />
              ) : null}
              <KeyValueRow
                label="Loan balance after"
                value={formatNaira(Math.max(0, balanceAfterKobo))}
                valueColor={Colors.primary}
                last
              />
            </View>

            {isPartial ? (
              <Banner
                tone="warning"
                text="Part payment — this instalment stays open until it is fully paid."
                style={{ marginTop: Spacing.md }}
              />
            ) : null}

            <AppButton
              label={`Pay ${formatNaira(amountKobo)}`}
              onPress={onConfirm}
              loading={loading}
              style={{ marginTop: Spacing.lg }}
              leftIcon={<Ionicons name="lock-closed" size={16} color={Colors.text.inverse} />}
            />
            <AppButton label="Cancel" variant="ghost" onPress={onCancel} disabled={loading} style={{ marginTop: 4 }} />
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },

  tlRow: { flexDirection: 'row' },
  tlSpine: { width: 26, alignItems: 'center', paddingTop: 18 },
  tlLine: { position: 'absolute', top: 36, bottom: -4, width: 2, borderRadius: 1, backgroundColor: Colors.border },
  tlNode: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  tlNodeInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  tlCard: {
    flex: 1, marginLeft: Spacing.sm + 2, marginBottom: Spacing.sm + 2,
    backgroundColor: Colors.background, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
  },
  tlCardCurrent: { borderColor: Colors.primary, ...Shadows.card, shadowOpacity: 0.08 },
  tlHead: { flexDirection: 'row', alignItems: 'flex-start' },
  tlNote: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 14, paddingHorizontal: Spacing.gutter },
  txDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderStrong },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  overlay: { flex: 1, backgroundColor: Colors.overlay },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
    ...Shadows.float,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderStrong, marginBottom: Spacing.lg },
  sheetIcon: {
    alignSelf: 'center', width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  sheetBody: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
});
