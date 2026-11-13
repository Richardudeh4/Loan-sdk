/** Shared money + date formatting. All amounts from the API are in kobo. */

export function formatNaira(kobo: number, opts: { decimals?: boolean } = {}): string {
  const { decimals = true } = opts;
  const naira = kobo / 100;
  return (
    '₦' +
    naira.toLocaleString('en-NG', {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    })
  );
}

/** Split into whole + fractional parts so the UI can de-emphasise kobo. */
export function splitNaira(kobo: number): { whole: string; fraction: string } {
  const naira = Math.abs(kobo) / 100;
  const whole = Math.floor(naira).toLocaleString('en-NG');
  const fraction = Math.round((naira - Math.floor(naira)) * 100)
    .toString()
    .padStart(2, '0');
  return { whole: (kobo < 0 ? '-' : '') + '₦' + whole, fraction: '.' + fraction };
}

export function formatNairaCompact(naira: number): string {
  if (naira >= 1_000_000) {
    const m = naira / 1_000_000;
    return `₦${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(0)}k`;
  return `₦${naira}`;
}

function safeDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** 18 Oct 2026 */
export function fmtDate(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return '—';
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** 18 Oct */
export function fmtDateShort(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return '—';
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

/** 18 Oct 2026 · 2:32 pm */
export function fmtDateTime(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return '—';
  const time = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${fmtDate(iso)} · ${time.toLowerCase()}`;
}

/** Whole days from today until the date (negative if past). */
export function daysUntil(iso: string | null | undefined): number | null {
  const d = safeDate(iso);
  if (!d) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function relativeDue(iso: string | null | undefined): string {
  const n = daysUntil(iso);
  if (n === null) return '';
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  if (n > 1) return `Due in ${n} days`;
  if (n === -1) return '1 day overdue';
  return `${Math.abs(n)} days overdue`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function initials(name?: string | null, fallback?: string | null): string {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return (fallback ?? '?').replace(/\D/g, '').slice(-2) || '?';
}

export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
