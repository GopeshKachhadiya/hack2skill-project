import { useState } from 'react';
import { useShipments } from '../hooks/useShipments';
import { useDisruptions } from '../hooks/useDisruptions';
import ShipmentMap from '../components/Map/ShipmentMap';
import type { Shipment } from '../../types';
import { STATUS_COLORS, DISRUPTION_COLORS } from '../utils/constants';
import { formatDate, formatCurrency, riskLabel, riskColor, formatDuration, timeAgo } from '../utils/formatters';
import {
  Package, AlertTriangle, TrendingUp, Clock, Eye, MapPin, Truck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { generateMockForecast } from '../utils/mockData';

const forecast = generateMockForecast('Global Network');

// Downsample to 24 points for chart
const chartData = forecast.data
  .filter((_, i) => i % 3 === 0)
  .slice(0, 24)
  .map(d => ({
    time: new Date(d.timestamp).getHours() + 'h',
    risk: +(d.disruptionLikelihood * 100).toFixed(1),
    upper: +(d.disruptionLikelihoodUpper * 100).toFixed(1),
    lower: +(d.disruptionLikelihoodLower * 100).toFixed(1),
    weather: +(d.weatherSeverity * 100).toFixed(1),
  }));

export default function DashboardPage() {
  const { data: shipments = [], isLoading: loadingShipments } = useShipments();
  const { data: disruptions = [], isLoading: loadingDisruptions } = useDisruptions();
  const [selected, setSelected] = useState<Shipment | null>(null);

  // Stats
  const onTime = shipments.filter(s => s.currentStatus === 'on_time').length;
  const delayed = shipments.filter(s => s.currentStatus === 'delayed').length;
  const critical = shipments.filter(s => s.currentStatus === 'critical').length;
  const activeDisruptions = disruptions.filter(d => d.status === 'active').length;

  const pieData = [
    { name: 'On Time', value: onTime, color: '#10b981' },
    { name: 'Delayed', value: delayed, color: '#f59e0b' },
    { name: 'Critical', value: critical, color: '#ef4444' },
    { name: 'Disrupted', value: shipments.filter(s => s.currentStatus === 'disrupted').length, color: '#8b5cf6' },
    { name: 'Delivered', value: shipments.filter(s => s.currentStatus === 'delivered').length, color: '#6b7280' },
  ];

  const topDisruptions = disruptions
    .filter(d => d.status === 'active')
    .sort((a, b) => b.predictedSeverity - a.predictedSeverity)
    .slice(0, 5);

  const recentShipments = [...shipments]
    .sort((a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime())
    .slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Metrics Row ── */}
      <div className="metrics-grid">
        <div className="glass-card metric-card" style={{ '--accent-color': '#3b82f6' } as React.CSSProperties}>
          <div className="metric-label">Total Shipments</div>
          <div className="metric-value">{shipments.length}</div>
          <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={13} /> Active fleet
          </div>
        </div>
        <div className="glass-card metric-card" style={{ '--accent-color': '#10b981' } as React.CSSProperties}>
          <div className="metric-label">On Time</div>
          <div className="metric-value" style={{ color: 'var(--color-success)' }}>{onTime}</div>
          <div className="metric-sub metric-delta-pos">
            {shipments.length > 0 ? Math.round((onTime / shipments.length) * 100) : 0}% on-time rate
          </div>
        </div>
        <div className="glass-card metric-card" style={{ '--accent-color': '#f59e0b' } as React.CSSProperties}>
          <div className="metric-label">Delayed</div>
          <div className="metric-value" style={{ color: 'var(--color-warning)' }}>{delayed}</div>
          <div className="metric-sub metric-delta-neg">{critical} critical</div>
        </div>
        <div className="glass-card metric-card" style={{ '--accent-color': '#ef4444' } as React.CSSProperties}>
          <div className="metric-label">Active Disruptions</div>
          <div className="metric-value" style={{ color: activeDisruptions > 5 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
            {activeDisruptions}
          </div>
          <div className="metric-sub">Predicted next 72h</div>
        </div>
      </div>

      {/* ── Map + Alerts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, minHeight: 500 }}>
        {/* Map */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={15} style={{ color: 'var(--color-brand)' }} />
            <span className="section-title" style={{ fontSize: '0.95rem' }}>Live Shipment Map</span>
            <span style={{ marginLeft: 'auto' }} className="badge badge-info">{shipments.length} Shipments</span>
          </div>
          <div style={{ height: 440 }}>
            <ShipmentMap
              shipments={shipments}
              disruptions={disruptions}
              selectedShipment={selected}
              onSelectShipment={setSelected}
              showRoutes
            />
          </div>
        </div>

        {/* Alert Feed */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={15} style={{ color: 'var(--color-danger)' }} />
            <span className="section-title" style={{ fontSize: '0.95rem' }}>Active Disruptions</span>
            <span style={{ marginLeft: 'auto' }} className="badge badge-danger">{activeDisruptions}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {topDisruptions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                No active disruptions
              </div>
            ) : topDisruptions.map(d => {
              const sev = d.predictedSeverity;
              const level = sev > 0.75 ? 'critical' : sev > 0.5 ? 'high' : sev > 0.25 ? 'medium' : 'low';
              return (
                <div key={d.id} className={`alert-item ${level}`}>
                  <div className="alert-title">
                    {d.disruptionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </div>
                  <div className="alert-body">{d.location}</div>
                  <div className="alert-meta">
                    <span style={{ color: riskColor(sev) }}>{(sev * 100).toFixed(0)}% severity</span>
                    <span>{d.affectedShipments} ships</span>
                    <span>{(d.probability * 100).toFixed(0)}% prob</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {d.recommendedAction.slice(0, 60)}…
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Forecast Chart */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="section-header">
            <div>
              <div className="section-title">72-Hour Disruption Forecast</div>
              <div className="section-sub">Prophet AI predictions with confidence intervals</div>
            </div>
            <span className="badge badge-info">🔮 Prophet</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.08)" />
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ background: '#111d2e', border: '1px solid rgba(99,179,237,0.2)', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="upper" stroke="none" fill="rgba(239,68,68,0.1)" fillOpacity={1} />
              <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} fill="url(#riskGrad)" name="Disruption Risk %" />
              <Area type="monotone" dataKey="weather" stroke="#3b82f6" strokeWidth={1.5} fill="url(#wGrad)" name="Weather Severity %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="section-header">
            <div className="section-title">Fleet Status</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#111d2e', border: '1px solid rgba(99,179,237,0.2)', borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
            {pieData.map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{p.name}</span>
                <span style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Shipments Table ── */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div className="section-header">
          <div>
            <div className="section-title">Recent Shipments</div>
            <div className="section-sub">Latest shipment updates</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Origin → Destination</th>
                <th>Cargo</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Delay</th>
                <th>ETA</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {recentShipments.map(s => (
                <tr key={s.id} onClick={() => setSelected(s)}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-brand)' }}>{s.id}</td>
                  <td style={{ color: 'var(--text-primary)' }}>
                    <div style={{ fontSize: '0.8rem' }}>{s.origin}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>→ {s.destination}</div>
                  </td>
                  <td>{s.cargoType}</td>
                  <td>
                    <span className={`badge badge-${s.currentStatus === 'on_time' || s.currentStatus === 'delivered' ? 'success' : s.currentStatus === 'delayed' ? 'warning' : 'danger'}`}>
                      <span className={`status-dot ${s.currentStatus}`} />
                      {s.currentStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: riskColor(s.riskScore), fontWeight: 600, fontSize: '0.8rem' }}>
                      {riskLabel(s.riskScore)}
                    </span>
                  </td>
                  <td style={{ color: s.delay > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                    {s.delay > 0 ? `+${s.delay.toFixed(1)}h` : '—'}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{formatDate(s.expectedArrival)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{formatCurrency(s.cargoValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
