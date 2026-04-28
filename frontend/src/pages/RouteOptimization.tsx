import { useMemo, useState } from 'react';
import { Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ShipmentMap from '../components/Map/ShipmentMap';
import { useDisruptions } from '../hooks/useDisruptions';
import { Graph, getRouteCoordinates, optimizeRoute } from '../utils/astar';
import { PORT_OPTIONS, SHIPPING_NODES, SHIPPING_EDGES } from '../utils/constants';
import { formatDuration, formatDistance, formatCurrency } from '../utils/formatters';
import { buildSeaOnlyGraph } from '../utils/seaRouting';
import type { RouteConstraints, RouteMode, RouteOptimizationResult } from '../types';

const PRIORITY_OPTIONS = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'fastest', label: 'Fastest' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'safest', label: 'Safest (Avoid Risk)' },
];

function buildMultimodalGraph(): Graph {
  const graph = new Graph();
  SHIPPING_NODES.forEach((node) => graph.addNode(node));
  SHIPPING_EDGES.forEach((edge) => graph.addEdge(edge));
  return graph;
}

function buildGraph(routeMode: RouteMode): Graph {
  return routeMode === 'sea' ? buildSeaOnlyGraph(PORT_OPTIONS) : buildMultimodalGraph();
}

function buildOptimizedPath(
  route: RouteOptimizationResult['optimizedRoute'] | null,
  graph: Graph,
  routeMode: RouteMode
): [number, number][] | undefined {
  if (!route) return undefined;

  if (routeMode === 'multimodal') {
    return route.waypoints.map((node) => [node.latitude, node.longitude] as [number, number]);
  }

  const coordinates = getRouteCoordinates(graph, route.nodeIds);
  if (coordinates.length < 2) return undefined;
  return coordinates.map((coord) => [coord.lat, coord.lng] as [number, number]);
}

function generateRecommendations(
  route: RouteOptimizationResult['optimizedRoute'],
  routeMode: RouteMode
): string[] {
  const recommendations: string[] = [];

  if (routeMode === 'sea') {
    recommendations.push('Sea-only mode follows a validated maritime backbone through offshore corridors and chokepoints instead of inland shortcuts.');
  } else {
    recommendations.push('Multimodal mode can use both sea links and land shortcuts where they improve efficiency.');
  }

  if (route.riskScore < 30) {
    recommendations.push('Route risk is currently low, so disruption exposure is manageable.');
  }

  if (route.totalTime < 200) {
    recommendations.push('Transit time is strong for the selected priority profile.');
  }

  recommendations.push(`The route uses ${route.stops} waypoint${route.stops === 1 ? '' : 's'} in the current network.`);
  recommendations.push('Keep monitoring live disruptions during the voyage for mid-route adjustments.');

  return recommendations;
}

export default function RouteOptimizationPage() {
  const { data: disruptions = [] } = useDisruptions();

  const [originId, setOriginId] = useState('shanghai');
  const [destId, setDestId] = useState('rotterdam');
  const [priority, setPriority] = useState<RouteConstraints['priority']>('balanced');
  const [routeMode, setRouteMode] = useState<RouteMode>('multimodal');
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [result, setResult] = useState<RouteOptimizationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const graph = useMemo(() => buildGraph(routeMode), [routeMode]);

  function handleOptimize() {
    if (originId === destId) return;

    setRunning(true);
    setRouteError(null);

    window.setTimeout(() => {
      const constraints: RouteConstraints = {
        priority,
        riskTolerance,
      };

      const optimized = optimizeRoute(originId, destId, graph, constraints);

      if (!optimized) {
        setResult(null);
        setRouteError(
          routeMode === 'sea'
            ? 'No sea-only corridor is available for this port pair in the current maritime network.'
            : 'No route could be found with the current network data.'
        );
        setRunning(false);
        return;
      }

      setResult({
        originalRoute: optimized.original,
        optimizedRoute: optimized.optimized,
        timeSaved: optimized.original.totalTime - optimized.optimized.totalTime,
        costSaved: optimized.original.totalCost - optimized.optimized.totalCost,
        riskReduction: optimized.original.riskScore - optimized.optimized.riskScore,
        recommendations: generateRecommendations(optimized.optimized, routeMode),
      });

      setRunning(false);
    }, 600);
  }

  const optimizedPath = useMemo(
    () => buildOptimizedPath(result?.optimizedRoute ?? null, graph, routeMode),
    [graph, result, routeMode]
  );

  const comparisonData = result
    ? [
        {
          metric: 'Time (h)',
          original: +result.originalRoute.totalTime.toFixed(0),
          optimized: +result.optimizedRoute.totalTime.toFixed(0),
        },
        {
          metric: 'Distance (km/10)',
          original: +(result.originalRoute.totalDistance / 10).toFixed(0),
          optimized: +(result.optimizedRoute.totalDistance / 10).toFixed(0),
        },
        {
          metric: 'Cost ($100)',
          original: +(result.originalRoute.totalCost / 100).toFixed(0),
          optimized: +(result.optimizedRoute.totalCost / 100).toFixed(0),
        },
        {
          metric: 'Risk Score',
          original: +result.originalRoute.riskScore.toFixed(0),
          optimized: +result.optimizedRoute.riskScore.toFixed(0),
        },
      ]
    : [];

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 112px)' }}>
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Zap size={16} style={{ color: 'var(--color-brand)' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)' }}>
              A* Route Optimizer
            </span>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Origin Port</label>
            <select
              className="input"
              value={originId}
              onChange={(event) => {
                setOriginId(event.target.value);
                setResult(null);
                setRouteError(null);
              }}
            >
              {PORT_OPTIONS.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Destination Port</label>
            <select
              className="input"
              value={destId}
              onChange={(event) => {
                setDestId(event.target.value);
                setResult(null);
                setRouteError(null);
              }}
            >
              {PORT_OPTIONS.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Optimization Priority</label>
            <select
              className="input"
              value={priority}
              onChange={(event) => setPriority(event.target.value as RouteConstraints['priority'])}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Route Type</label>
            <select
              className="input"
              value={routeMode}
              onChange={(event) => {
                setRouteMode(event.target.value as RouteMode);
                setResult(null);
                setRouteError(null);
              }}
            >
              <option value="multimodal">Sea + Land</option>
              <option value="sea">Only Sea</option>
            </select>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label className="label">Risk Tolerance: {riskTolerance}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={riskTolerance}
              onChange={(event) => setRiskTolerance(Number(event.target.value))}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                marginTop: 4,
              }}
            >
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
            {running ? 'Calculating route...' : 'Calculate Optimal Route'}
          </button>

          {originId === destId && (
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-danger)',
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              Origin and destination must differ.
            </div>
          )}

          {routeError && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: '0.78rem',
                color: '#fecaca',
                background: 'rgba(127, 29, 29, 0.24)',
                border: '1px solid rgba(239, 68, 68, 0.24)',
              }}
            >
              {routeError}
            </div>
          )}
        </div>

        {result && (
          <div className="glass-card" style={{ padding: 16 }}>
            <div
              style={{
                fontWeight: 700,
                marginBottom: 12,
                color: 'var(--text-bright)',
                fontSize: '0.9rem',
              }}
            >
              Recommendations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.recommendations.map((recommendation, index) => (
                <div
                  key={`${recommendation}-${index}`}
                  style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}
                >
                  {recommendation}
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="glass-card" style={{ padding: 16 }}>
            <div
              style={{
                fontWeight: 700,
                marginBottom: 12,
                color: 'var(--text-bright)',
                fontSize: '0.9rem',
              }}
            >
              Optimization Savings
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                {
                  label: 'Time Saved',
                  value: formatDuration(Math.max(0, result.timeSaved)),
                  color: 'var(--color-success)',
                },
                {
                  label: 'Cost Saved',
                  value: formatCurrency(Math.max(0, result.costSaved)),
                  color: 'var(--color-brand)',
                },
                {
                  label: 'Risk Reduced',
                  value: `${Math.max(0, result.riskReduction).toFixed(0)}pts`,
                  color: 'var(--color-purple)',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: item.color,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', flex: '0 0 380px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-bright)' }}>
              Route Visualization
            </span>
            {result && (
              <span style={{ marginLeft: 12, fontSize: '0.75rem', color: 'var(--color-success)' }}>
                {routeMode === 'sea' ? 'Sea-only corridor' : 'Multimodal corridor'} ({result.optimizedRoute.stops}{' '}
                stops)
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

        {result && (
          <div className="route-comparison-grid">
            <div className="glass-card route-card original">
              <div style={{ fontWeight: 700, marginBottom: 14, color: '#3b82f6', fontSize: '0.95rem' }}>
                Original Route
              </div>
              <RouteMetrics route={result.originalRoute} color="#3b82f6" />
            </div>
            <div className="glass-card route-card optimized">
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 14,
                  color: '#10b981',
                  fontSize: '0.95rem',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                Optimized Route
                <span className="savings-badge">A* Algorithm</span>
              </div>
              <RouteMetrics route={result.optimizedRoute} color="#10b981" />
            </div>
          </div>
        )}

        {result && comparisonData.length > 0 && (
          <div className="glass-card" style={{ padding: 20 }}>
            <div className="section-header">
              <div className="section-title">Performance Comparison</div>
              <div style={{ display: 'flex', gap: 14, fontSize: '0.75rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#3b82f6' }} />
                  Original
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981' }} />
                  Optimized
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={comparisonData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.08)" />
                <XAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#111d2e',
                    border: '1px solid rgba(99,179,237,0.2)',
                    borderRadius: 8,
                  }}
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

function RouteMetrics({
  route,
  color,
}: {
  route: RouteOptimizationResult['optimizedRoute'];
  color: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        { label: 'Distance', value: formatDistance(route.totalDistance) },
        { label: 'Transit Time', value: formatDuration(route.totalTime) },
        { label: 'Cost', value: formatCurrency(route.totalCost) },
        { label: 'Risk Score', value: `${route.riskScore.toFixed(0)}/100` },
        { label: 'Stops', value: `${route.stops} waypoints` },
      ].map((metric) => (
        <div
          key={metric.label}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}
        >
          <span style={{ color: 'var(--text-muted)' }}>{metric.label}</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {metric.value}
          </span>
        </div>
      ))}

      {route.waypoints.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>WAYPOINTS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {route.waypoints.map((node) => (
              <span
                key={node.id}
                style={{
                  padding: '2px 8px',
                  background: `${color}20`,
                  color,
                  borderRadius: 4,
                  fontSize: '0.72rem',
                  border: `1px solid ${color}40`,
                }}
              >
                {node.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}