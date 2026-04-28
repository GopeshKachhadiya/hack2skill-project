import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Shipment, Disruption } from '../../types';
import { STATUS_COLORS, DISRUPTION_COLORS, MAP_TILES, MAP_ATTRIBUTIONS } from '../../utils/constants';
import { formatPercent, formatDate, riskLabel, riskColor } from '../../utils/formatters';

const defaultIcon = L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown };
delete defaultIcon._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function FlyToShipment({ shipment }: { shipment: Shipment | null }) {
  const map = useMap();
  useEffect(() => {
    if (shipment) map.flyTo([shipment.currentCoords.lat, shipment.currentCoords.lng], 6, { duration: 1.2 });
  }, [shipment, map]);
  return null;
}

type MapPoint = [number, number];

function unwrapPolyline(points: MapPoint[]): MapPoint[] {
  if (points.length <= 1) return points;

  const normalized: MapPoint[] = [[points[0][0], points[0][1]]];
  let previousLng = points[0][1];

  for (let index = 1; index < points.length; index += 1) {
    const [lat, lng] = points[index];
    let adjustedLng = lng;

    while (adjustedLng - previousLng > 180) adjustedLng -= 360;
    while (adjustedLng - previousLng < -180) adjustedLng += 360;

    normalized.push([lat, adjustedLng]);
    previousLng = adjustedLng;
  }

  return normalized;
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

export default function ShipmentMap({ shipments, disruptions, selectedShipment, onSelectShipment, showDisruptions = true, showRoutes = false, optimizedPath }: ShipmentMapProps) {
  const selectedShipmentPath = selectedShipment?.route
    ? unwrapPolyline(selectedShipment.route.map((c) => [c.lat, c.lng] as MapPoint))
    : null;
  const optimizedPolyline = optimizedPath ? unwrapPolyline(optimizedPath) : null;

  return (
    <div className="map-container" style={{ height: '100%', minHeight: 480 }}>
      <MapContainer center={[25, 20]} zoom={3} style={{ width: '100%', height: '100%' }} minZoom={2} maxZoom={16} scrollWheelZoom>
        <TileLayer url={MAP_TILES.street} attribution={MAP_ATTRIBUTIONS.street} />
        <FlyToShipment shipment={selectedShipment} />
        {showDisruptions && disruptions.filter((d) => d.status === 'active').map((d) => (
          <Circle key={d.id} center={[d.coords.lat, d.coords.lng]} radius={d.radius * 1000} pathOptions={{ color: DISRUPTION_COLORS[d.disruptionType] ?? '#ef4444', fillColor: DISRUPTION_COLORS[d.disruptionType] ?? '#ef4444', fillOpacity: d.probability * 0.35, weight: 1.5, dashArray: '6 4' }}>
            <Popup><div style={{ minWidth: 200 }}><div style={{ fontWeight: 700, marginBottom: 6, color: DISRUPTION_COLORS[d.disruptionType] }}>Warning: {d.disruptionType.replace(/_/g, ' ').toUpperCase()}</div><div><b>Location:</b> {d.location}</div><div><b>Probability:</b> {formatPercent(d.probability)}</div><div><b>Severity:</b> {riskLabel(d.predictedSeverity)}</div><div><b>Affected:</b> {d.affectedShipments} shipments</div><div style={{ marginTop: 6, fontSize: '0.8rem', color: '#94a3b8' }}>{formatDate(d.predictedTimeWindow.start)} - {formatDate(d.predictedTimeWindow.end)}</div><div style={{ marginTop: 6, fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>{d.recommendedAction}</div></div></Popup>
          </Circle>
        ))}
        {shipments.map((s) => (
          <Circle key={s.id} center={[s.currentCoords.lat, s.currentCoords.lng]} radius={s.currentStatus === 'critical' ? 120000 : 80000} pathOptions={{ color: STATUS_COLORS[s.currentStatus], fillColor: STATUS_COLORS[s.currentStatus], fillOpacity: 0.8, weight: 0 }} eventHandlers={{ click: () => onSelectShipment(s) }}>
            <Popup><div style={{ minWidth: 220 }}><div style={{ fontWeight: 700, marginBottom: 6 }}>Package {s.id}</div><div><b>Route:</b> {s.origin}{" -> "}{s.destination}</div><div><b>Status:</b> <span style={{ color: STATUS_COLORS[s.currentStatus] }}>{s.currentStatus.replace('_', ' ')}</span></div><div><b>Cargo:</b> {s.cargoType}</div><div><b>Priority:</b> {s.priority}</div><div><b>Delay:</b> {s.delay > 0 ? `${s.delay.toFixed(1)}h` : 'On time'}</div><div style={{ marginTop: 6 }}><b>Risk:</b> <span style={{ color: riskColor(s.riskScore) }}>{riskLabel(s.riskScore)}</span></div><div style={{ marginTop: 6, fontSize: '0.78rem', color: '#94a3b8' }}>ETA: {formatDate(s.expectedArrival)}</div></div></Popup>
          </Circle>
        ))}
        {showRoutes && selectedShipmentPath && selectedShipmentPath.length > 1 && (
          <Polyline positions={selectedShipmentPath} pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '8 4', opacity: 0.7 }} />
        )}
        {optimizedPolyline && optimizedPolyline.length > 1 && (
          <Polyline positions={optimizedPolyline} pathOptions={{ color: '#10b981', weight: 3, opacity: 0.9 }} />
        )}
      </MapContainer>
    </div>
  );
}