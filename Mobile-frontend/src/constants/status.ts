import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { InstalmentStatus, LoanStatus } from '@/RequestHandler/Request';
import { Colors } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface StatusMeta {
  label: string;
  color: string;
  bg: string;
  icon: IconName;
}

export function loanStatusMeta(status: LoanStatus | string): StatusMeta {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', color: Colors.success, bg: Colors.successLight, icon: 'pulse' };
    case 'PAID':
      return { label: 'Paid off', color: Colors.primary, bg: Colors.primaryLight, icon: 'checkmark-done' };
    case 'PENDING':
      return { label: 'In review', color: Colors.warning, bg: Colors.warningLight, icon: 'time-outline' };
    case 'DEFAULTED':
      return { label: 'Defaulted', color: Colors.error, bg: Colors.errorLight, icon: 'alert-circle' };
    case 'REJECTED':
      return { label: 'Declined', color: Colors.text.secondary, bg: Colors.surfaceAlt, icon: 'close-circle-outline' };
    default:
      return { label: String(status), color: Colors.text.secondary, bg: Colors.surfaceAlt, icon: 'ellipse-outline' };
  }
}

export function instalmentStatusMeta(status: InstalmentStatus): StatusMeta {
  switch (status) {
    case 'PAID':
      return { label: 'Paid', color: Colors.success, bg: Colors.successLight, icon: 'checkmark' };
    case 'PARTIAL':
      return { label: 'Partial', color: Colors.warning, bg: Colors.warningLight, icon: 'remove' };
    case 'OVERDUE':
      return { label: 'Overdue', color: Colors.error, bg: Colors.errorLight, icon: 'alert' };
    case 'ROLLED_OVER':
      return { label: 'Rolled over', color: Colors.violet, bg: Colors.violetLight, icon: 'return-down-forward' };
    default:
      return { label: 'Upcoming', color: Colors.text.muted, bg: Colors.surfaceAlt, icon: 'ellipse-outline' };
  }
}
