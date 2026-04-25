import type { Severity } from '../types';

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return h > 0 ? `${days}d ${h}h` : `${days}d`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toLocaleString()}km`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function severityLabel(value: number): Severity {
  if (value < 0.25) return 'low';
  if (value < 0.5) return 'medium';
  if (value < 0.75) return 'high';
  return 'critical';
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function riskLabel(score: number): string {
  if (score < 0.25) return 'LOW';
  if (score < 0.5) return 'MEDIUM';
  if (score < 0.75) return 'HIGH';
  return 'CRITICAL';
}

export function riskColor(score: number): string {
  if (score < 0.25) return '#10b981';
  if (score < 0.5) return '#f59e0b';
  if (score < 0.75) return '#f97316';
  return '#ef4444';
}
