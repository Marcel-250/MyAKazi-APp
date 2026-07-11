import { useLanguage } from '@/lib/i18n/LanguageContext';

export function formatCurrency(amount, currency = 'RWF') {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 ' + currency;
  const num = Number(amount);
  if (currency === 'RWF') {
    return num.toLocaleString('en-US') + ' RWF';
  }
  return num.toLocaleString('en-US', { style: 'currency', currency: currency });
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getStatusColor(status) {
  const colors = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    inactive: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    planning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    unpaid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    quote: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    invoice: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    receipt: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    processing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    lead: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    prospect: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    customer: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    ordered: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    contract: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    report: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    utilities: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    supplies: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    travel: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    salaries: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    marketing: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    maintenance: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    late: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    half_day: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return colors[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
}

export function StatusBadge({ status, label }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
      {label || status}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-card rounded-xl border border-border shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
      )}
      <h3 className="font-semibold text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
    </div>
  );
}