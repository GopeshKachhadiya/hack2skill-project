import { useState } from 'react';
import { useShipments } from '../hooks/useShipments';
import type { Shipment } from '../types';
import { formatDate, formatCurrency, riskLabel, riskColor } from '../utils/formatters';
import { Search } from 'lucide-react';

export default function ShipmentsPage() {
  const { data: shipments = [], isLoading } = useShipments();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'id' | 'riskScore' | 'delay' | 'cargoValue'>('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Shipment | null>(null);

  const filtered = shipments
    .filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.id.toLowerCase().includes(q) || s.origin.toLowerCase().includes(q) || s.destination.toLowerCase().includes(q) || s.cargoType.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || s.currentStatus === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const v = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'id') return v * a.id.localeCompare(b.id);
      return v * (a[sortBy] - b[sortBy]);
    });

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {}
      <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder="Search by ID, origin, destination..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'on_time', 'delayed', 'critical', 'disrupted', 'delivered'].map(f => (
            <button
              key={f}
              className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {filtered.length} / {shipments.length} shipments
        </div>
      </div>

      {}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading shipments...</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('id')} style={{ cursor: 'pointer' }}>
                    ID {sortBy === 'id' ? (sortDir === 'asc' ? ' (asc)' : ' (desc)') : ''}
                  </th>
                  <th>Route</th>
                  <th>Cargo</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th onClick={() => toggleSort('riskScore')} style={{ cursor: 'pointer' }}>
                    Risk {sortBy === 'riskScore' ? (sortDir === 'asc' ? ' (asc)' : ' (desc)') : ''}
                  </th>
                  <th onClick={() => toggleSort('delay')} style={{ cursor: 'pointer' }}>
                    Delay {sortBy === 'delay' ? (sortDir === 'asc' ? ' (asc)' : ' (desc)') : ''}
                  </th>
                  <th>ETA</th>
                  <th onClick={() => toggleSort('cargoValue')} style={{ cursor: 'pointer' }}>
                    Value {sortBy === 'cargoValue' ? (sortDir === 'asc' ? ' (asc)' : ' (desc)') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} onClick={() => setSelected(s === selected ? null : s)} style={{ background: selected?.id === s.id ? 'rgba(59,130,246,0.08)' : undefined }}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-brand)', fontWeight: 600 }}>{s.id}</td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>{s.origin}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>to {s.destination}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{s.cargoType}</td>
                    <td>
                      <span className={`badge badge-${s.priority === 'time-sensitive' ? 'danger' : s.priority === 'urgent' ? 'warning' : 'muted'}`}>
                        {s.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${s.currentStatus === 'on_time' || s.currentStatus === 'delivered' ? 'success' : s.currentStatus === 'delayed' ? 'warning' : 'danger'}`}>
                        <span className={`status-dot ${s.currentStatus}`} />
                        {s.currentStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ width: 60 }}>
                          <div className="progress-fill" style={{ width: `${s.riskScore * 100}%`, background: riskColor(s.riskScore) }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', color: riskColor(s.riskScore), fontWeight: 600 }}>{riskLabel(s.riskScore)}</span>
                      </div>
                    </td>
                    <td style={{ color: s.delay > 0 ? 'var(--color-warning)' : 'var(--color-success)', fontWeight: 600, fontSize: '0.85rem' }}>
                      {s.delay > 0 ? `+${s.delay.toFixed(1)}h` : '—'}
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{formatDate(s.expectedArrival)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{formatCurrency(s.cargoValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No shipments match your filters
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}