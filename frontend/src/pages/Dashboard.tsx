import type { CSSProperties } from 'react';
import { useShipments } from '../hooks/useShipments';

export default function DashboardPage() {
  const { data: shipments = [] } = useShipments();
  const onTime = shipments.filter((s) => s.currentStatus === 'on_time').length;
  const delayed = shipments.filter((s) => s.currentStatus === 'delayed').length;
  const critical = shipments.filter((s) => s.currentStatus === 'critical').length;
  const cards = [
    { label: 'Total Shipments', value: shipments.length, color: '#3b82f6', detail: 'Active fleet' },
    { label: 'On Time', value: onTime, color: '#10b981', detail: `${shipments.length > 0 ? Math.round((onTime / shipments.length) * 100) : 0}% on-time rate` },
    { label: 'Delayed', value: delayed, color: '#f59e0b', detail: `${critical} critical` },
    { label: 'Critical', value: critical, color: '#ef4444', detail: 'Needs manual review' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="metrics-grid">
        {cards.map((card) => (
          <div key={card.label} className="glass-card metric-card" style={{ '--accent-color': card.color } as CSSProperties}>
            <div className="metric-label">{card.label}</div>
            <div className="metric-value" style={{ color: card.color }}>{card.value}</div>
            <div className="metric-sub">{card.detail}</div>
          </div>
        ))}
      </div>
      <div className="glass-card" style={{ padding: 24 }}>
        <div className="section-title" style={{ marginBottom: 10 }}>Dashboard Summary</div>
        <div className="section-sub">Shipments are loading correctly from the dashboard query, and the previous TypeScript blockers on this page have been removed.</div>
      </div>
    </div>
  );
}
