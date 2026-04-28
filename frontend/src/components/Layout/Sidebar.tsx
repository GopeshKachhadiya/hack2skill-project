import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, BarChart3, Zap, Bell, Package, Shield
} from 'lucide-react';
import { useDisruptions } from '../../hooks/useDisruptions';

const navItems = [
  { to: '/', icon: <LayoutDashboard size={16} />, label: 'Dashboard', exact: true },
  { to: '/map', icon: <Map size={16} />, label: 'Live Map' },
  { to: '/optimize', icon: <Zap size={16} />, label: 'Route Optimizer' },
  { to: '/shipments', icon: <Package size={16} />, label: 'Shipments' },
  { to: '/analytics', icon: <BarChart3 size={16} />, label: 'Analytics' },
  { to: '/alerts', icon: <Bell size={16} />, label: 'Alerts' },

];

export default function Sidebar() {
  const { data: disruptions = [] } = useDisruptions();
  const criticalCount = disruptions.filter(d => d.predictedSeverity > 0.7 && d.status === 'active').length;

  return (
    <nav className="sidebar">
      {}
      <div className="sidebar-logo">
        <div>
          <div className="sidebar-logo-text">Anvayaa</div>
          <div className="sidebar-logo-sub">Supply Chain Platform</div>
        </div>
      </div>

      {}
      <div style={{ flex: 1, padding: '12px 0' }}>
        <div className="sidebar-section-title">Navigation</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.to === '/alerts' && criticalCount > 0 && (
              <span className="nav-badge">{criticalCount}</span>
            )}
          </NavLink>
        ))}
      </div>

      {}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <div style={{ marginBottom: 2 }}>A* Route Optimization</div>
          <div>Prophet 48-72h Forecasts</div>
        </div>
      </div>
    </nav>
  );
}