import { useState, useMemo } from 'react';
import { SHIPPING_NODES, SHIPPING_EDGES } from '../utils/constants';
import api from '../services/api';
import type { RouteOptimizationResult, RouteConstraints, Route } from '../types';
import { formatDuration, formatDistance, formatCurrency } from '../utils/formatters';
import ShipmentMap from '../components/Map/ShipmentMap';
import { useDisruptions } from '../hooks/useDisruptions';
import { Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';



const PRIORITY_OPTIONS = [
  { value: 'balanced', label: 'âš–ï¸ Balanced' },
  { value: 'fastest', label: 'âš¡ Fastest' },
  { value: 'cheapest', label: 'ðŸ’° Cheapest' },
  { value: 'safest', label: 'ðŸ›¡ï¸ Safest (Avoid Risk)' },
];

export default function RouteOptimizationPage() {
  const { data: disruptions = [] } = useDisruptions();

  const [originId, setOriginId] = useState('shanghai');
  const [destId, setDestId] = useState('rotterdam');
  const [priority, setPriority] = useState<string>('balanced');
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [result, setResult] = useState<RouteOptimizationResult | null>(null);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [running, setRunning] = useState(false);

  async function handleOptimize() {
    if (originId === destId) return;
    setRunning(true);
    setSelectedRouteIdx(0);

    try {
      const { data } = await api.post('/api/v1/routes/optimize', {
        waypoints: [
          { ...SHIPPING_NODES.find(n => n.id === originId) },
          { ...SHIPPING_NODES.find(n => n.id === destId) }
        ],
        constraints: {
          priority: priority as any,
          riskTolerance
        }
      });

      // Map backend response to frontend Route object
      const mappedRoute: Route = {
        nodeIds: data.optimized_waypoints.map((wp: any) => wp.name || 'Waypoint'),
        waypoints: data.optimized_waypoints.map((wp: any) => ({
          id: wp.name || 'wp',
          name: wp.name || 'Waypoint',
          latitude: wp.lat,
          longitude: wp.lng,
          type: 'port' as const,
          properties: {
            baseDelay: 0,
            operationalCosts: 0,
            capacity: 100,
            country: 'Unknown'
          }
        })),
        totalDistance: data.total_distance || 1000,
        totalTime: data.total_time || 24,
        totalCost: data.total_cost || 5000,
        riskScore: (1.0 - (data.disruption_avoidance_score || 0.5)) * 100,
        stops: data.optimized_waypoints.length
      };

      setResult({
        originalRoute: mappedRoute, // For now, use the same as original for comparison
        optimizedRoute: mappedRoute,
        alternatives: [mappedRoute],
        timeSaved: data.estimated_time_savings_minutes / 60,
        costSaved: 0,
        riskReduction: data.disruption_avoidance_score * 100,
        recommendations: [
          `Algorithm: ${data.algorithm}`,
          `Backend forecast applied: ${data.backend_forecast_applied}`,
          'âœ… Route optimized via Hybrid Contraction Hierarchies'
        ]
      });
    } catch (err) {
      console.error('Optimization failed:', err);
    } finally {
      setRunning(false);
    }
  }

  const currentRoute = useMemo(() => {
    if (!result || !result.alternatives) return result?.optimizedRoute;
    return result.alternatives[selectedRouteIdx];
  }, [result, selectedRouteIdx]);

  function generateRecommendations(route: Route): string[] {
    const recs: string[] = [];
    if (route.riskScore < 30) recs.push('âœ… Route has low disruption risk â€” proceed with confidence');
    if (route.totalTime < 200) recs.push('âš¡ Optimal transit time achieved via efficient routing');
    recs.push(`ðŸ—ºï¸ Route passes through ${route.stops} waypoints for maximum efficiency`);
    recs.push('ðŸ”„ Monitor real-time disruption feed during transit');
    return recs;
  }

  const optimizedPath = useMemo(() => {
    if (!currentRoute) return undefined;
    return currentRoute.waypoints
      .filter(Boolean)
      .map(n => [n.latitude, n.longitude] as [number, number]);
  }, [currentRoute]);

  const comparisonData = useMemo(() => {
    if (!result || !currentRoute) return [];
    return [
      { metric: 'Time (h)', original: +result.originalRoute.totalTime.toFixed(0), optimized: +currentRoute.totalTime.toFixed(0) },
      { metric: 'Distance (km/10)', original: +(result.originalRoute.totalDistance / 10).toFixed(0), optimized: +(currentRoute.totalDistance / 10).toFixed(0) },
      { metric: 'Cost ($100)', original: +(result.originalRoute.totalCost / 100).toFixed(0), optimized: +(currentRoute.totalCost / 100).toFixed(0) },
      { metric: 'Risk Score', original: +result.originalRoute.riskScore.toFixed(0), optimized: +currentRoute.riskScore.toFixed(0) },
    ];
  }, [result, currentRoute]);

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 112px)' }}>
      {/* â”€â”€ Left Panel â”€â”€ */}
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Route Input */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Zap size={16} style={{ color: 'var(--color-brand)' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)' }}>Maritime A* Optimizer</span>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Origin Port</label>
            <select className="input" value={originId} onChange={e => { setOriginId(e.target.value); setResult(null); }}>
              {SHIPPING_NODES.map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Destination Port</label>
            <select className="input" value={destId} onChange={e => { setDestId(e.target.value); setResult(null); }}>
              {SHIPPING_NODES.map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Optimization Priority</label>
            <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleOptimize}
            disabled={running || originId === destId}
          >
            {running ? 'â³ Calculating Paths...' : 'ðŸš¢ Find Sea Routes'}
          </button>
        </div>

        {/* Route Alternatives Selection */}
        {result && result.alternatives && result.alternatives.length > 1 && (
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-bright)', fontSize: '0.9rem' }}>
              ðŸ›£ï¸ Available Alternatives
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.alternatives.map((alt, idx) => (
                <button
                  key={idx}
                  className={`btn ${selectedRouteIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'space-between', padding: '8px 12px', fontSize: '0.8rem' }}
                  onClick={() => setSelectedRouteIdx(idx)}
                >
                  <span>Route {idx + 1} {idx === 0 ? '(Optimal)' : ''}</span>
                  <span style={{ opacity: 0.7 }}>{formatDuration(alt.totalTime)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {result && currentRoute && (
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-bright)', fontSize: '0.9rem' }}>
              ðŸ’¡ Recommendations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {generateRecommendations(currentRoute).map((r, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€ Right Panel â”€â”€ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Map */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', flex: '0 0 380px' }}>
          <div style={{ height: 380 }}>
            <ShipmentMap
              shipments={[]}
              disruptions={disruptions}
              selectedShipment={null}
              onSelectShipment={() => {}}
              showDisruptions
              optimizedPath={optimizedPath}
            />
          </div>
        </div>

        {/* Route Comparison */}
        {result && currentRoute && (
          <div className="route-comparison-grid">
            <div className="glass-card route-card original">
              <div style={{ fontWeight: 700, marginBottom: 14, color: '#3b82f6', fontSize: '0.95rem' }}>
                ðŸ“ Baseline Route
              </div>
              <RouteMetrics route={result.originalRoute} color="#3b82f6" />
            </div>
            <div className="glass-card route-card optimized">
              <div style={{ fontWeight: 700, marginBottom: 14, color: '#10b981', fontSize: '0.95rem', display: 'flex', gap: 10, alignItems: 'center' }}>
                âœ… Selected Sea Route
                <span className="savings-badge">A* Sea-Lane</span>
              </div>
              <RouteMetrics route={currentRoute} color="#10b981" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RouteMetrics({ route, color }: { route: Route; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        { label: 'Distance', value: formatDistance(route.totalDistance) },
        { label: 'Transit Time', value: formatDuration(route.totalTime) },
        { label: 'Cost Estimate', value: formatCurrency(route.totalCost) },
        { label: 'Maritime Risk', value: `${route.riskScore.toFixed(0)}/100` },
      ].map(m => (
        <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{m.label}</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{m.value}</span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>MARITIME WAYPOINTS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {route.waypoints.map((n, i) => n && (
            <span key={i} style={{ padding: '2px 8px', background: `${color}20`, color, borderRadius: 4, fontSize: '0.72rem', border: `1px solid ${color}40` }}>
              {n.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

