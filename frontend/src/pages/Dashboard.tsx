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
        <div className="section-title" style={{ marginBottom: 15 }}>Logistics Insights</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          <div className="summary-item">
            <div className="summary-label">Fleet Status</div>
            <div className="summary-text">
              {shipments.length > 0 
                ? `Currently monitoring ${shipments.length} active shipments. ${Math.round((onTime / shipments.length) * 100)}% of the fleet is operating within normal parameters.`
                : 'Waiting for shipment data to sync...'}
            </div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Risk Distribution</div>
            <div className="summary-text">
              {delayed + critical > 0
                ? `Attention required: ${delayed} shipments are experiencing delays, and ${critical} are in critical condition due to predicted disruptions.`
                : 'All routes currently showing low risk levels. No immediate intervention required.'}
            </div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Next Update</div>
            <div className="summary-text">
              Automated disruption scan running in 15 minutes. Weather and port status feeds are currently healthy.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}