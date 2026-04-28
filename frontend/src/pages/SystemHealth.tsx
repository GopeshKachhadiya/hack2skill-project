import { generateMockHealth } from '../utils/mockData';
import { useWebSocket } from '../hooks/useWebSocket';
import { type CSSProperties } from 'react';
import { CheckCircle, XCircle, AlertCircle, Wifi } from 'lucide-react';

const health = generateMockHealth();

function StatusIcon({ status }: { status: 'online' | 'offline' | 'degraded' | 'ok' | string }) {
  if (status === 'online' || status === 'ok') return <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />;
  if (status === 'offline') return <XCircle size={16} style={{ color: 'var(--color-danger)' }} />;
  return <AlertCircle size={16} style={{ color: 'var(--color-warning)' }} />;
}

export default function SystemHealthPage() {
  const { status: wsStatus } = useWebSocket('/ws/disruptions');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {}
      <div className="glass-card" style={{ padding: 28, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{
          width: 90, height: 90, borderRadius: '50%',
          background: `conic-gradient(var(--color-success) ${health.overallHealth}%, var(--color-bg-elevated) 0)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            background: 'var(--color-bg-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column',
          }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-success)', lineHeight: 1 }}>{health.overallHealth}%</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-bright)' }}>System Health</div>
          <div style={{ color: 'var(--color-success)', fontWeight: 600, marginTop: 4 }}>All critical systems operational</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>Last checked: just now</div>
        </div>
      </div>

      {}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-bright)' }}>Backend API</span>
            <StatusIcon status={health.backendApi.status} />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Status</div>
          <div style={{ fontWeight: 600, color: health.backendApi.status === 'online' ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {health.backendApi.status.toUpperCase()}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 10, marginBottom: 4 }}>Response Time</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {health.backendApi.responseTime}ms
          </div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, 100 - health.backendApi.responseTime / 5)}%`, background: 'var(--color-success)' }} />
          </div>
        </div>

        {}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-bright)' }}>PostgreSQL DB</span>
            <StatusIcon status={health.database.status} />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Status</div>
          <div style={{ fontWeight: 600, color: health.database.status === 'online' ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {health.database.status.toUpperCase()}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 10, marginBottom: 4 }}>Query Latency</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {health.database.latency}ms
          </div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${Math.max(10, 100 - health.database.latency * 2)}%`, background: 'var(--color-brand)' }} />
          </div>
        </div>

        {}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-bright)' }}>WebSocket</span>
            <Wifi size={16} style={{ color: wsStatus === 'connected' ? 'var(--color-success)' : 'var(--color-danger)' }} />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Status</div>
          <div className={`ws-indicator ws-${wsStatus}`} style={{ display: 'inline-flex' }}>
            <span className="ws-dot" />
            <span>{wsStatus}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 10, marginBottom: 4 }}>Latency</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {health.websocket.latency}ms
          </div>
        </div>
      </div>

      {}
      <div className="glass-card" style={{ padding: 20 }}>
        <div className="section-header">
          <div className="section-title">Data Sources</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {Object.entries(health.dataSources).map(([key, src]) => (
            <div key={key} style={{ padding: 16, background: 'var(--color-bg-elevated)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-bright)' }}>
                  {key}
                </span>
                <StatusIcon status={src.status} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Last update: {new Date(src.lastUpdate).toLocaleTimeString()}
              </div>
              <div style={{ marginTop: 8 }}>
                <span className="badge badge-success">{src.status.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {}
      <div className="metrics-grid">
        {[
          { label: 'API Success Rate', value: '99.2%', color: 'var(--color-success)' },
          { label: 'Avg Response Time', value: `${health.backendApi.responseTime}ms`, color: 'var(--color-brand)' },
          { label: 'Data Freshness', value: '< 1 min', color: 'var(--color-accent)' },
          { label: 'Error Rate', value: '0.8%', color: 'var(--color-warning)' },
        ].map((m, i) => (
          <div key={i} className="glass-card metric-card" style={{ '--accent-color': m.color } as CSSProperties}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ color: m.color, fontSize: '1.7rem' }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}