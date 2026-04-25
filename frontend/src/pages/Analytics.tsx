import { generateMockPerformance, generateMockForecast } from '../utils/mockData';
import { SHIPPING_NODES } from '../utils/constants';
import { useState, type CSSProperties } from 'react';
import { formatDate } from '../utils/formatters';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend
} from 'recharts';

const perf = generateMockPerformance();

const accuracyOverTime = Array.from({ length: 30 }, (_, i) => ({
  day: `D-${30 - i}`,
  precision: +(perf.modelAccuracy.precision * 100 + (Math.random() - 0.5) * 8).toFixed(1),
  recall: +(perf.modelAccuracy.recall * 100 + (Math.random() - 0.5) * 8).toFixed(1),
}));

const radarData = [
  { metric: 'Precision', value: +(perf.modelAccuracy.precision * 100).toFixed(0) },
  { metric: 'Recall', value: +(perf.modelAccuracy.recall * 100).toFixed(0) },
  { metric: 'F1 Score', value: +(perf.modelAccuracy.f1Score * 100).toFixed(0) },
  { metric: 'Coverage', value: Math.min(100, +(perf.coverage.avgHoursToDisruption / 72 * 100).toFixed(0)) },
  { metric: 'Accuracy', value: +(100 - perf.modelAccuracy.mape).toFixed(0) },
];

export default function AnalyticsPage() {
  const [selectedLocation, setSelectedLocation] = useState('shanghai');
  const forecast = generateMockForecast(selectedLocation);
  const chartData = forecast.data.filter((_, i) => i % 3 === 0).map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    risk: +(d.disruptionLikelihood * 100).toFixed(1),
    upper: +(d.disruptionLikelihoodUpper * 100).toFixed(1),
    lower: +(d.disruptionLikelihoodLower * 100).toFixed(1),
    weather: +(d.weatherSeverity * 100).toFixed(1),
    traffic: +(d.trafficIndex * 100).toFixed(1),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Model Performance Cards */}
      <div>
        <div className="section-header">
          <div>
            <div className="section-title">🔮 Prophet Model Performance</div>
            <div className="section-sub">AI prediction accuracy metrics — Last retrained: {formatDate(perf.lastRetrained)}</div>
          </div>
        </div>
        <div className="metrics-grid">
          {[
            { label: 'Precision', value: `${(perf.modelAccuracy.precision * 100).toFixed(1)}%`, color: 'var(--color-brand)', desc: 'Predicted disruptions that occurred' },
            { label: 'Recall', value: `${(perf.modelAccuracy.recall * 100).toFixed(1)}%`, color: 'var(--color-success)', desc: 'Actual disruptions captured' },
            { label: 'F1 Score', value: `${(perf.modelAccuracy.f1Score * 100).toFixed(1)}%`, color: 'var(--color-accent)', desc: 'Harmonic mean of P & R' },
            { label: 'MAPE', value: `${perf.modelAccuracy.mape.toFixed(1)}%`, color: 'var(--color-warning)', desc: 'Mean absolute percentage error' },
          ].map((m, i) => (
            <div key={i} className="glass-card metric-card" style={{ '--accent-color': m.color } as CSSProperties}>
              <div className="metric-label">{m.label}</div>
              <div className="metric-value" style={{ color: m.color, fontSize: '1.8rem' }}>{m.value}</div>
              <div className="metric-sub">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Accuracy over Time */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="section-header">
            <div className="section-title">Model Accuracy (30 Days)</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={accuracyOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.08)" />
              <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 100]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: '#111d2e', border: '1px solid rgba(99,179,237,0.2)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              <Line type="monotone" dataKey="precision" stroke="#3b82f6" strokeWidth={2} dot={false} name="Precision %" />
              <Line type="monotone" dataKey="recall" stroke="#10b981" strokeWidth={2} dot={false} name="Recall %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="section-header"><div className="section-title">Model Profile</div></div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} cx="50%" cy="50%">
              <PolarGrid stroke="rgba(99,179,237,0.15)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Coverage Stats */}
      <div className="metrics-grid">
        {[
          { label: 'Avg Hours to Disruption', value: `${perf.coverage.avgHoursToDisruption.toFixed(1)}h`, color: 'var(--color-accent)', desc: 'Lead time for predictions' },
          { label: 'Total Predicted', value: perf.coverage.totalDisruptionsPredicted.toLocaleString(), color: 'var(--color-brand)', desc: 'Disruptions predicted' },
          { label: 'Correct', value: perf.coverage.correctPredictions.toLocaleString(), color: 'var(--color-success)', desc: 'Accurate predictions' },
          { label: 'False Positives', value: perf.coverage.falsePositives.toString(), color: 'var(--color-warning)', desc: 'Over-predictions' },
        ].map((m, i) => (
          <div key={i} className="glass-card metric-card" style={{ '--accent-color': m.color } as CSSProperties}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ color: m.color, fontSize: '1.7rem' }}>{m.value}</div>
            <div className="metric-sub">{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Location Forecast */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div className="section-header">
          <div>
            <div className="section-title">72-Hour Location Forecast</div>
            <div className="section-sub">Prophet prediction with confidence bands</div>
          </div>
          <select
            className="input"
            style={{ width: 220 }}
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
          >
            {SHIPPING_NODES.map(n => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="riskGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.08)" />
            <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip contentStyle={{ background: '#111d2e', border: '1px solid rgba(99,179,237,0.2)', borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
            <Area type="monotone" dataKey="upper" stroke="none" fill="rgba(239,68,68,0.1)" name="Confidence Band" />
            <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} fill="url(#riskGrad2)" name="Disruption Risk %" />
            <Line type="monotone" dataKey="traffic" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Traffic Index %" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

