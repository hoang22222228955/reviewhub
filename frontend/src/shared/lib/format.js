export function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function daysLeft(endAt) {
  if (!endAt) return 0;
  const now = new Date().setHours(0, 0, 0, 0);
  const end = new Date(endAt).setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
}

export function quotaPercent(used, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}
