import { useState, type CSSProperties } from 'react';
import { useDisruptions } from '../hooks/useDisruptions';
import { DISRUPTION_COLORS } from '../utils/constants';
import { formatDate, formatPercent } from '../utils/formatters';
import { Bell, Filter } from 'lucide-react';

export default function AlertsPage() {
  const { data: disruptions = [], refetch } = useDisruptions();
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');
  const [typeFilter, setTypeFilter] = useState('all');

  const types = ['all', ...Array.from(new Set(disruptions.map(d => d.disruptionType)))];

  const filtered = disruptions
    .filter(d => filter === 'all' || d.status === filter)
    .filter(d => typeFilter === 'all' || d.disruptionType === typeFilter)
    .sort((a, b) => b.predictedSeverity - a.predictedSeverity);

  const activeCount = disruptions.filter(d => d.status === 'active').length;
  const criticalCount = disruptions.filter(d => d.status === 'active' && d.predictedSeverity > 0.75).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Disruptions', value: disruptions.length, color: 'var(--color-brand)' },
          { label: 'Active', value: activeCount, color: 'var(--color-warning)' },
          { label: 'Critical', value: criticalCount, color: 'var(--color-danger)' },
          { label: 'Resolved', value: disruptions.filter(d => d.status === 'resolved').length, color: 'var(--color-success)' },
        ].map((m, i) => (
          <div key={i} className="glass-card metric-card" style={{ '--accent-color': m.color } as CSSProperties}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {}
      <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Bell size={15} style={{ color: 'var(--color-brand)' }} />
        <span style={{ fontWeight: 600, color: 'var(--text-bright)' }}>Filter:</span>
        {(['all', 'active', 'resolved'] as const).map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
        <div style={{ marginLeft: 8, width: 1, height: 20, background: 'var(--color-border)' }} />
        <Filter size={13} style={{ color: 'var(--text-muted)' }} />
        {types.map(t => (
          <button
            key={t}
            className={`btn btn-sm ${typeFilter === t ? 'btn-outline' : 'btn-ghost'}`}
            onClick={() => setTypeFilter(t)}
          >
            {t === 'all' ? 'All Types' : t.replace(/_/g, ' ')}
          </button>
        ))}
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => refetch()}>
          Refresh
        </button>
      </div>

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div className="glass-card" style={{ padding: '50px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '1.1rem' }}>No disruptions found</div>
            <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>All supply chain routes are operating normally</div>
          </div>
        ) : filtered.map(d => {
          const sev = d.predictedSeverity;
          const level = sev > 0.75 ? 'critical' : sev > 0.5 ? 'high' : sev > 0.25 ? 'medium' : 'low';
          const typeColor = DISRUPTION_COLORS[d.disruptionType] ?? '#94a3b8';

          return (
            <div key={d.id} className={`glass-card alert-item ${level}`} style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                {}
                <div style={{
                  width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                  background: `${typeColor}20`, border: `1px solid ${typeColor}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                }}>
                  {d.disruptionType.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '0.95rem' }}>
                      {d.disruptionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    <span className={`badge badge-${level === 'critical' ? 'danger' : level === 'high' ? 'warning' : level === 'medium' ? 'info' : 'success'}`}>{level.toUpperCase()}</span>
                    {d.status === 'resolved' && <span className="badge badge-muted">RESOLVED</span>}
                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{d.id}</span>
                  </div>

                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                    Location: {d.location}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                    {[
                      { label: 'Probability', value: formatPercent(d.probability) },
                      { label: 'Severity', value: formatPercent(d.predictedSeverity) },
                      { label: 'Confidence', value: formatPercent(d.confidenceScore) },
                      { label: 'Affected', value: `${d.affectedShipments} ships` },
                    ].map(m => (
                      <div key={m.label}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {}
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', gap: 12 }}>
                    <span>Window: {formatDate(d.predictedTimeWindow.start)} to {formatDate(d.predictedTimeWindow.end)}</span>
                  </div>

                  {}
                  <div style={{
                    padding: '10px 14px', background: 'rgba(59,130,246,0.08)',
                    borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)',
                    fontSize: '0.8rem', color: 'var(--text-secondary)',
                  }}>
                    <strong>Recommendation:</strong> {d.recommendedAction}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
