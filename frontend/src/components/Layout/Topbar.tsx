import { useLocation } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useShipments } from '../../hooks/useShipments';
import { useDisruptions } from '../../hooks/useDisruptions';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const PAGE_TITLES: Record<string, string> = {
  '/': '📊 Dashboard',
  '/map': '🗺️ Live Map',
  '/optimize': '⚡ Route Optimizer',
  '/shipments': '📦 Shipments',
  '/analytics': '📈 Analytics',
  '/alerts': '🔔 Disruption Alerts',

};

export default function Topbar() {
  const location = useLocation();
  const { status } = useWebSocket('/ws/disruptions');
  const { data: shipments = [] } = useShipments();
  const { data: disruptions = [] } = useDisruptions();
  const qc = useQueryClient();

  const title = PAGE_TITLES[location.pathname] ?? 'Anvayaa Supply Chain';
  const activeAlerts = disruptions.filter(d => d.status === 'active' && d.predictedSeverity > 0.5).length;

  function refresh() {
    qc.invalidateQueries();
  }

  return (
    <div className="topbar">
      <h1 style={{ fontSize: '1.1rem', fontWeight: 700, flex: 1 }}>{title}</h1>

      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shipments</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)' }}>{shipments.length}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alerts</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: activeAlerts > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{activeAlerts}</div>
        </div>

        <div className={`ws-indicator ws-${status}`}>
          {status === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="ws-dot" />
          <span style={{ color: 'var(--text-secondary)' }}>{status}</span>
        </div>

        <button className="btn btn-ghost btn-icon" onClick={refresh} title="Refresh data">
          <RefreshCw size={15} />
        </button>
      </div>
    </div>
  );
}
