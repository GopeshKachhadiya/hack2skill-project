import { useState, useMemo } from 'react';
import { SHIPPING_NODES, SHIPPING_EDGES } from '../utils/constants';
import { Graph, optimizeRoute, type CostWeights } from '../utils/astar';
import { nodeToCoord } from '../utils/geo';
import type { RouteOptimizationResult, RouteConstraints } from '../../types';
import { formatDuration, formatDistance, formatCurrency } from '../utils/formatters';
import ShipmentMap from '../components/Map/ShipmentMap';
import { useDisruptions } from '../hooks/useDisruptions';
import { Zap, ArrowRight, CheckCircle, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Build the global shipping graph once
const graph = new Graph();
SHIPPING_NODES.forEach(n => graph.addNode(n));
SHIPPING_EDGES.forEach(e => graph.addEdge(e));

const PRIORITY_OPTIONS = [
  { value: 'balanced', label: '⚖️ Balanced' },
  { value: 'fastest', label: '⚡ Fastest' },
  { value: 'cheapest', label: '💰 Cheapest' },
  { value: 'safest', label: '🛡️ Safest (Avoid Risk)' },
];

export default function RouteOptimizationPage() {
  const { data: disruptions = [] } = useDisruptions();

  const [originId, setOriginId] = useState('shanghai');
  const [destId, setDestId] = useState('rotterdam');
  const [priority, setPriority] = useState<string>('balanced');
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [result, setResult] = useState<RouteOptimizationResult | null>(null);
  const [running, setRunning] = useState(false);

  function handleOptimize() {
    if (originId === destId) return;
    setRunning(true);

    // Small timeout to show loading state
    setTimeout(() => {
      const constraints: RouteConstraints = {
        priority: priority as RouteConstraints['priority'],
        riskTolerance,
      };

      const res = optimizeRoute(originId, destId, graph, constraints);
      if (res) {
        setResult({
          originalRoute: res.original,
          optimizedRoute: res.optimized,
          timeSaved: res.original.totalTime - res.optimized.totalTime,
          costSaved: res.original.totalCost - res.optimized.totalCost,
          riskReduction: res.original.riskScore - res.optimized.riskScore,
          recommendations: generateRecommendations(res.optimized),
        });
      }
      setRunning(false);
    }, 600);
  }

  function generateRecommendations(route: typeof result extends null ? never : RouteOptimizationResult['optimizedRoute']): string[] {
    const recs: string[] = [];
    if (route.riskScore < 30) recs.push('✅ Route has low disruption risk — proceed with confidence');
    if (route.totalTime < 200) recs.push('⚡ Optimal transit time achieved via efficient routing');
    recs.push(`🗺️ Route passes through ${route.stops} waypoints for maximum efficiency`);
    recs.push('🔄 Monitor real-time disruption feed during transit');
    return recs;
  }

  const optimizedPath = useMemo(() => {
    if (!result) return undefined;
    return result.optimizedRoute.waypoints
      .filter(Boolean)
      .map(n => [n.latitude, n.longitude] as [number, number]);
  }, [result]);

  const comparisonData = result ? [
    { metric: 'Time (h)', original: +result.originalRoute.totalTime.toFixed(0), optimized: +result.optimizedRoute.totalTime.toFixed(0) },
    { metric: 'Distance (km/10)', original: +(result.originalRoute.totalDistance / 10).toFixed(0), optimized: +(result.optimizedRoute.totalDistance / 10).toFixed(0) },
    { metric: 'Cost ($100)', original: +(result.originalRoute.totalCost / 100).toFixed(0), optimized: +(result.optimizedRoute.totalCost / 100).toFixed(0) },
    { metric: 'Risk Score', original: +result.originalRoute.riskScore.toFixed(0), optimized: +result.optimizedRoute.riskScore.toFixed(0) },
  ] : [];

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 112px)' }}>
      {/* ── Left Panel ── */}
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Route Input */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Zap size={16} style={{ color: 'var(--color-brand)' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)' }}>A* Route Optimizer</span>
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

          <div style={{ marginBottom: 18 }}>
            <label className="label">Risk Tolerance: {riskTolerance}%</label>
            <input
              type="range" min={0} max={100} value={riskTolerance}
              onChange={e => setRiskTolerance(+e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
              <span>Risk Averse</span>
              <span>Risk Tolerant</span>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleOptimize}
            disabled={running || originId === destId}
          >
            {running ? '⏳ Calculating...' : '🚀 Calculate Optimal Route'}
          </button>
          {originId === destId && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: 6, textAlign: 'center' }}>
              Origin and destination must differ
            </div>
          )}
        </div>

        {/* Recommendations */}
        {result && (
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-bright)', fontSize: '0.9rem' }}>
              💡 Recommendations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.recommendations.map((r, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r}</div>
              ))}
            </div>
          </div>
        )}

        {/* Savings Summary */}
        {result && (
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-bright)', fontSize: '0.9rem' }}>
              💰 Optimization Savings
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Time Saved', value: formatDuration(Math.max(0, result.timeSaved)), color: 'var(--color-success)' },
                { label: 'Cost Saved', value: formatCurrency(Math.max(0, result.costSaved)), color: 'var(--color-brand)' },
                { label: 'Risk Reduced', value: `${Math.max(0, result.riskReduction).toFixed(0)}pts`, color: 'var(--color-purple)' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: item.color, fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Map */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', flex: '0 0 380px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-bright)' }}>🗺️ Route Visualization</span>
            {result && (
              <span style={{ marginLeft: 12, fontSize: '0.75rem', color: 'var(--color-success)' }}>
                ✅ Optimized route ({result.optimizedRoute.stops} stops)
              </span>
            )}
          </div>
          <div style={{ height: 340 }}>
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
        {result && (
          <div className="route-comparison-grid">
            {/* Original */}
            <div className="glass-card route-card original">
              <div style={{ fontWeight: 700, marginBottom: 14, color: '#3b82f6', fontSize: '0.95rem' }}>
                📍 Original Route
              </div>
              <RouteMetrics route={result.originalRoute} color="#3b82f6" />
            </div>
            {/* Optimized */}
            <div className="glass-card route-card optimized">
              <div style={{ fontWeight: 700, marginBottom: 14, color: '#10b981', fontSize: '0.95rem', display: 'flex', gap: 10, alignItems: 'center' }}>
                ✅ Optimized Route
                <span className="savings-badge">A* Algorithm</span>
              </div>
              <RouteMetrics route={result.optimizedRoute} color="#10b981" />
            </div>
          </div>
        )}

        {/* Comparison Chart */}
        {result && comparisonData.length > 0 && (
          <div className="glass-card" style={{ padding: 20 }}>
            <div className="section-header">
              <div className="section-title">Performance Comparison</div>
              <div style={{ display: 'flex', gap: 14, fontSize: '0.75rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#3b82f6' }} /> Original</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981' }} /> Optimized</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={comparisonData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.08)" />
                <XAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#111d2e', border: '1px solid rgba(99,179,237,0.2)', borderRadius: 8 }}
                />
                <Bar dataKey="original" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Original" />
                <Bar dataKey="optimized" fill="#10b981" radius={[4, 4, 0, 0]} name="Optimized" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function RouteMetrics({ route, color }: { route: RouteOptimizationResult['optimizedRoute']; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        { label: 'Distance', value: formatDistance(route.totalDistance) },
        { label: 'Transit Time', value: formatDuration(route.totalTime) },
        { label: 'Cost', value: formatCurrency(route.totalCost) },
        { label: 'Risk Score', value: `${route.riskScore.toFixed(0)}/100` },
        { label: 'Stops', value: `${route.stops} waypoints` },
      ].map(m => (
        <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{m.label}</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{m.value}</span>
        </div>
      ))}
      {route.waypoints && route.waypoints.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>WAYPOINTS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {route.waypoints.map((n, i) => n && (
              <span key={i} style={{ padding: '2px 8px', background: `${color}20`, color, borderRadius: 4, fontSize: '0.72rem', border: `1px solid ${color}40` }}>
                {n.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
