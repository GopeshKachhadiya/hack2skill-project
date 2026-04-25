import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Shipment, Disruption } from '../../types';
import { STATUS_COLORS, DISRUPTION_COLORS, MAP_TILES, MAP_ATTRIBUTIONS } from '../../utils/constants';
import { formatPercent, formatDate, riskLabel, riskColor } from '../../utils/formatters';

// Fix Leaflet icon paths broken by Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createShipmentIcon(status: Shipment['currentStatus']): L.DivIcon {
  const color = STATUS_COLORS[status] ?? '#94a3b8';
  const isPulse = status === 'critical' || status === 'disrupted';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px; height:14px; border-radius:50%;
      background:${color};
      border: 2px solid rgba(255,255,255,0.7);
      box-shadow: 0 0 ${isPulse ? '12px' : '6px'} ${color};
      ${isPulse ? 'animation: pulse 2s infinite;' : ''}
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// Component to fly to a selected shipment
function FlyToShipment({ shipment }: { shipment: Shipment | null }) {
  const map = useMap();
  useEffect(() => {
    if (shipment) {
      map.flyTo([shipment.currentCoords.lat, shipment.currentCoords.lng], 6, { duration: 1.2 });
    }
  }, [shipment, map]);
  return null;
}

interface ShipmentMapProps {
  shipments: Shipment[];
  disruptions: Disruption[];
  selectedShipment: Shipment | null;
  onSelectShipment: (s: Shipment | null) => void;
  showDisruptions?: boolean;
  showRoutes?: boolean;
  optimizedPath?: [number, number][];
}

export default function ShipmentMap({
  shipments,
  disruptions,
  selectedShipment,
  onSelectShipment,
  showDisruptions = true,
  showRoutes = false,
  optimizedPath,
}: ShipmentMapProps) {
  return (
    <div className="map-container" style={{ height: '100%', minHeight: 480 }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity:1; transform:scale(1); }
          50% { opacity:0.5; transform:scale(1.4); }
        }
        .leaflet-popup-content-wrapper {
          background: #111d2e !important;
          border: 1px solid rgba(99,179,237,0.2) !important;
          color: #e2e8f0 !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
        }
        .leaflet-popup-tip { background: #111d2e !important; }
        .leaflet-popup-close-button { color: #94a3b8 !important; }
      `}</style>

      <MapContainer
        center={[25, 20]}
        zoom={3}
        style={{ width: '100%', height: '100%' }}
        minZoom={2}
        maxZoom={16}
        scrollWheelZoom
      >
        <TileLayer
          url={MAP_TILES.street}
          attribution={MAP_ATTRIBUTIONS.street}
        />

        <FlyToShipment shipment={selectedShipment} />

        {/* Disruption Zones */}
        {showDisruptions && disruptions
          .filter(d => d.status === 'active')
          .map(d => (
            <Circle
              key={d.id}
              center={[d.coords.lat, d.coords.lng]}
              radius={d.radius * 1000}
              pathOptions={{
                color: DISRUPTION_COLORS[d.disruptionType] ?? '#ef4444',
                fillColor: DISRUPTION_COLORS[d.disruptionType] ?? '#ef4444',
                fillOpacity: d.probability * 0.35,
                weight: 1.5,
                dashArray: '6 4',
              }}
            >
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: DISRUPTION_COLORS[d.disruptionType] }}>
                    ⚠️ {d.disruptionType.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div><b>Location:</b> {d.location}</div>
                  <div><b>Probability:</b> {formatPercent(d.probability)}</div>
                  <div><b>Severity:</b> {riskLabel(d.predictedSeverity)}</div>
                  <div><b>Affected:</b> {d.affectedShipments} shipments</div>
                  <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#94a3b8' }}>
                    {formatDate(d.predictedTimeWindow.start)} – {formatDate(d.predictedTimeWindow.end)}
                  </div>
                  <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    {d.recommendedAction}
                  </div>
                </div>
              </Popup>
            </Circle>
          ))}

        {/* Shipment Markers */}
        {shipments.map(s => {
          const icon = createShipmentIcon(s.currentStatus);
          return (
            <Circle
              key={s.id}
              center={[s.currentCoords.lat, s.currentCoords.lng]}
              radius={s.currentStatus === 'critical' ? 120000 : 80000}
              pathOptions={{
                color: STATUS_COLORS[s.currentStatus],
                fillColor: STATUS_COLORS[s.currentStatus],
                fillOpacity: 0.8,
                weight: 0,
              }}
              eventHandlers={{ click: () => onSelectShipment(s) }}
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    📦 {s.id}
                  </div>
                  <div><b>Route:</b> {s.origin} → {s.destination}</div>
                  <div><b>Status:</b> <span style={{ color: STATUS_COLORS[s.currentStatus] }}>{s.currentStatus.replace('_', ' ')}</span></div>
                  <div><b>Cargo:</b> {s.cargoType}</div>
                  <div><b>Priority:</b> {s.priority}</div>
                  <div><b>Delay:</b> {s.delay > 0 ? `${s.delay.toFixed(1)}h` : 'On time'}</div>
                  <div style={{ marginTop: 6 }}>
                    <b>Risk:</b> <span style={{ color: riskColor(s.riskScore) }}>{riskLabel(s.riskScore)}</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#94a3b8' }}>
                    ETA: {formatDate(s.expectedArrival)}
                  </div>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* Route paths */}
        {showRoutes && selectedShipment?.route && (
          <Polyline
            positions={selectedShipment.route.map(c => [c.lat, c.lng])}
            pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '8 4', opacity: 0.7 }}
          />
        )}

        {/* Optimized Route */}
        {optimizedPath && optimizedPath.length > 1 && (
          <Polyline
            positions={optimizedPath}
            pathOptions={{ color: '#10b981', weight: 3, opacity: 0.9 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
