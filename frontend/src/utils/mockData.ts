
import type { Shipment, Disruption, ForecastDataPoint, ForecastSeries, ModelPerformanceMetrics, SystemHealth, Coordinate } from '../types';
import { SHIPPING_NODES } from './constants';
import { buildSeaOnlyGraph } from './seaRouting';
import { aStar, getRouteCoordinates } from './astar';

const CARGO_TYPES = ['Container', 'Bulk', 'Refrigerated', 'Tanker', 'Air Freight', 'Breakbulk'];
const DISRUPTION_TYPES = ['port_congestion', 'weather', 'traffic', 'mechanical', 'customs', 'geopolitical'] as const;

// Build the maritime graph once – it's expensive, so we cache it at module level
const SEA_GRAPH = buildSeaOnlyGraph(SHIPPING_NODES.filter((n) => n.type === 'port'));

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600000).toISOString();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

/**
 * Given a polyline of coordinates and a progress fraction [0,1],
 * returns the coordinate that lies that fraction of the total path length
 * along the route (great-circle segment lengths).
 */
function interpolateAlongRoute(route: Coordinate[], progress: number): Coordinate {
  if (route.length === 0) return { lat: 0, lng: 0 };
  if (route.length === 1) return route[0];

  // Compute cumulative segment lengths
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const d = Math.hypot(b.lat - a.lat, b.lng - a.lng); // fast approx – fine for interpolation
    segLengths.push(d);
    total += d;
  }

  const target = progress * total;
  let accumulated = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (accumulated + segLengths[i] >= target) {
      const t = segLengths[i] === 0 ? 0 : (target - accumulated) / segLengths[i];
      const a = route[i];
      const b = route[i + 1];
      return {
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      };
    }
    accumulated += segLengths[i];
  }

  return route[route.length - 1];
}

/**
 * Returns the sea-route coordinate list for origin→destination.
 * Falls back to [origin, destination] only if A* finds no path.
 */
function getSeaRoute(originId: string, destinationId: string): Coordinate[] {
  const nodeIds = aStar(originId, destinationId, SEA_GRAPH);
  if (nodeIds && nodeIds.length >= 2) {
    return getRouteCoordinates(SEA_GRAPH, nodeIds);
  }
  // Fallback: straight line (both ports are in the ocean anyway)
  const o = SEA_GRAPH.getNode(originId);
  const d = SEA_GRAPH.getNode(destinationId);
  if (o && d) return [{ lat: o.latitude, lng: o.longitude }, { lat: d.latitude, lng: d.longitude }];
  return [];
}

export function generateMockShipments(count = 75): Shipment[] {
  const portNodes = SHIPPING_NODES.filter((n) => n.type === 'port');
  const statuses: Shipment['currentStatus'][] = ['on_time', 'delayed', 'critical', 'delivered', 'disrupted'];
  const statusWeights = [0.45, 0.25, 0.1, 0.1, 0.1];

  function pickStatus(): Shipment['currentStatus'] {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < statuses.length; i++) {
      cum += statusWeights[i];
      if (r < cum) return statuses[i];
    }
    return 'on_time';
  }

  return Array.from({ length: count }, (_, i) => {
    const origin = randomItem(portNodes);
    let destination = randomItem(portNodes);
    while (destination.id === origin.id) destination = randomItem(portNodes);

    const status = pickStatus();
    const delay = status === 'on_time' ? 0 : status === 'delayed' ? randomBetween(1, 8) : randomBetween(8, 48);
    const riskScore = status === 'critical' || status === 'disrupted'
      ? randomBetween(0.65, 1)
      : status === 'delayed'
      ? randomBetween(0.35, 0.65)
      : randomBetween(0, 0.35);

    const progress = Math.random();

    // ── Real maritime route via A* ───────────────────────────────────────────
    const seaRoute = getSeaRoute(origin.id, destination.id);

    // Ship's current position is interpolated along the actual sea route
    const currentCoords = seaRoute.length > 0
      ? interpolateAlongRoute(seaRoute, progress)
      : { lat: origin.latitude, lng: origin.longitude };

    return {
      id: `SHP-${String(i + 1000).padStart(4, '0')}`,
      origin: origin.name,
      destination: destination.name,
      originCoords: { lat: origin.latitude, lng: origin.longitude },
      destinationCoords: { lat: destination.latitude, lng: destination.longitude },
      currentCoords,
      departureTime: hoursAgo(randomBetween(12, 240)),
      expectedArrival: hoursFromNow(randomBetween(24, 500)),
      currentStatus: status,
      cargoType: randomItem(CARGO_TYPES),
      cargoValue: Math.round(randomBetween(50000, 5000000)),
      priority: randomItem(['normal', 'urgent', 'time-sensitive'] as const),
      riskScore,
      delay,
      // Full sea-lane polyline: ship dots and selected-route lines follow real maritime paths
      route: seaRoute.length > 0 ? seaRoute : [
        { lat: origin.latitude, lng: origin.longitude },
        { lat: destination.latitude, lng: destination.longitude },
      ],
    } satisfies Shipment;
  });
}

export function generateMockDisruptions(count = 12): Disruption[] {
  return Array.from({ length: count }, (_, i) => {
    const location = randomItem(SHIPPING_NODES);
    const type = randomItem(DISRUPTION_TYPES);
    const probability = randomBetween(0.3, 0.95);
    const severity = randomBetween(0.2, 0.95);

    return {
      id: `DIS-${String(i + 100).padStart(3, '0')}`,
      location: location.name,
      coords: { lat: location.latitude + randomBetween(-2, 2), lng: location.longitude + randomBetween(-2, 2) },
      disruptionType: type,
      predictedSeverity: severity,
      probability,
      predictedTimeWindow: {
        start: hoursFromNow(randomBetween(0, 24)),
        end: hoursFromNow(randomBetween(24, 72)),
      },
      confidenceScore: randomBetween(0.6, 0.95),
      recommendedAction: getRecommendation(type),
      affectedShipments: Math.round(randomBetween(2, 30)),
      radius: randomBetween(50, 500),
      status: Math.random() > 0.2 ? 'active' : 'resolved',
    } satisfies Disruption;
  });
}

function getRecommendation(type: string): string {
  const recs: Record<string, string> = {
    port_congestion: 'Reroute to alternative port or delay departure by 12-24 hours',
    weather: 'Monitor typhoon forecast, consider delaying departure',
    traffic: 'Use alternative inland route to bypass congestion',
    mechanical: 'Schedule maintenance window, have spare vessels on standby',
    customs: 'Pre-clear documents, engage expedited customs broker',
    geopolitical: 'Monitor situation, activate contingency routing via safer corridor',
  };
  return recs[type] || 'Assess situation and consult operations team';
}

export function generateMockForecast(location: string): ForecastSeries {
  const now = Date.now();
  const data: ForecastDataPoint[] = Array.from({ length: 73 }, (_, i) => {
    const baseRisk = 0.15 + Math.sin(i / 6) * 0.1;
    const value = Math.max(0, Math.min(1, baseRisk + randomBetween(-0.05, 0.1)));
    return {
      timestamp: new Date(now + i * 3600000).toISOString(),
      disruptionLikelihood: value,
      disruptionLikelihoodUpper: Math.min(1, value + randomBetween(0.05, 0.15)),
      disruptionLikelihoodLower: Math.max(0, value - randomBetween(0.05, 0.1)),
      weatherSeverity: Math.max(0, randomBetween(0, 0.5)),
      trafficIndex: Math.max(0, Math.min(1, 0.3 + randomBetween(-0.1, 0.3))),
    };
  });

  return {
    location,
    forecastGeneratedAt: new Date().toISOString(),
    data,
  };
}

export function generateMockPerformance(): ModelPerformanceMetrics {
  return {
    modelAccuracy: {
      precision: randomBetween(0.78, 0.92),
      recall: randomBetween(0.72, 0.88),
      f1Score: randomBetween(0.75, 0.90),
      mape: randomBetween(8, 18),
    },
    coverage: {
      avgHoursToDisruption: randomBetween(28, 52),
      totalDisruptionsPredicted: Math.round(randomBetween(800, 1500)),
      correctPredictions: Math.round(randomBetween(600, 1200)),
      falsePositives: Math.round(randomBetween(50, 150)),
    },
    lastRetrained: hoursAgo(randomBetween(24, 168)),
    nextRetraining: hoursFromNow(randomBetween(24, 168)),
  };
}

export function generateMockHealth(): SystemHealth {
  return {
    backendApi: { status: 'online', responseTime: Math.round(randomBetween(80, 300)) },
    database: { status: 'online', latency: Math.round(randomBetween(5, 50)) },
    websocket: { connected: Math.random() > 0.1, latency: Math.round(randomBetween(20, 80)) },
    dataSources: {
      weather: { lastUpdate: hoursAgo(randomBetween(0, 0.5)), status: 'ok' },
      traffic: { lastUpdate: hoursAgo(randomBetween(0, 0.1)), status: 'ok' },
      port: { lastUpdate: hoursAgo(randomBetween(0, 1)), status: 'ok' },
    },
    overallHealth: Math.round(randomBetween(85, 99)),
  };
}