import { useState } from 'react';
import { useShipments } from '../hooks/useShipments';
import { useDisruptions } from '../hooks/useDisruptions';
import ShipmentMap from '../components/Map/ShipmentMap';
import type { Shipment } from '../types';
import { formatDate, formatCurrency, riskLabel, riskColor } from '../utils/formatters';

export default function LiveMapPage() {
  const { data: shipments = [] } = useShipments();
  const { data: disruptions = [] } = useDisruptions();
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showDisruptions, setShowDisruptions] = useState(true);

  const filtered = filter === 'all' ? shipments : shipments.filter(s => s.currentStatus === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {}
      <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-bright)' }}>Filter:</span>
        {['all', 'on_time', 'delayed', 'critical', 'disrupted', 'delivered'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? `All (${shipments.length})` : f.replace('_', ' ')}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={showDisruptions} onChange={e => setShowDisruptions(e.target.checked)} />
            Show Disruption Zones
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 16, transition: 'all 0.3s ease' }}>
        {}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ height: 'calc(100vh - 220px)', minHeight: 500 }}>
            <ShipmentMap
              shipments={filtered}
              disruptions={disruptions}
              selectedShipment={selected}
              onSelectShipment={s => setSelected(s === selected ? null : s)}
              showDisruptions={showDisruptions}
              showRoutes
            />
          </div>
        </div>

        {}
        {selected && (
          <div className="glass-card animate-slide-in" style={{ padding: 20, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)' }}>
                ID: {selected.id}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(null)}>X</button>
            </div>

            {}
            <div style={{ marginBottom: 16 }}>
              <span className={`badge badge-${selected.currentStatus === 'on_time' || selected.currentStatus === 'delivered' ? 'success' : selected.currentStatus === 'delayed' ? 'warning' : 'danger'}`}>
                <span className={`status-dot ${selected.currentStatus} pulse`} />
                {selected.currentStatus.replace('_', ' ')}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Origin', value: selected.origin },
                { label: 'Destination', value: selected.destination },
                { label: 'Cargo Type', value: selected.cargoType },
                { label: 'Priority', value: selected.priority },
                { label: 'Departure', value: formatDate(selected.departureTime) },
                { label: 'ETA', value: formatDate(selected.expectedArrival) },
                { label: 'Delay', value: selected.delay > 0 ? `+${selected.delay.toFixed(1)}h` : 'None', highlight: selected.delay > 0 ? 'var(--color-warning)' : 'var(--color-success)' },
                { label: 'Cargo Value', value: formatCurrency(selected.cargoValue) },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: ('highlight' in item ? item.highlight : undefined) || 'var(--text-primary)' }}>{item.value}</span>
                </div>
              ))}

              {}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Risk Score</span>
                  <span style={{ fontWeight: 700, color: riskColor(selected.riskScore) }}>{riskLabel(selected.riskScore)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${selected.riskScore * 100}%`,
                    background: riskColor(selected.riskScore),
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
