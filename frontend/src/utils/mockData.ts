/**
 * Mock Data Generator for Offline Development
 * Generates realistic-looking supply chain data when backend is unavailable.
 */

import type { Shipment, Disruption, ForecastDataPoint, ForecastSeries, ModelPerformanceMetrics, SystemHealth } from '../types';
import { SHIPPING_NODES } from './constants';

const CARGO_TYPES = ['Container', 'Bulk', 'Refrigerated', 'Tanker', 'Air Freight', 'Breakbulk'];
const DISRUPTION_TYPES = ['port_congestion', 'weather', 'traffic', 'mechanical', 'customs', 'geopolitical'] as const;

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600000).toISOString();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

// Generate 70+ mock shipments
export function generateMockShipments(count = 75): Shipment[] {
  const statuses: Shipment['status'][] = ['on_time', 'delayed', 'critical', 'delivered', 'disrupted'];
  const statusWeights = [0.45, 0.25, 0.1, 0.1, 0.1];

  function pickStatus(): Shipment['currentStatus'] {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < statuses.length; i++) {
      cum += statusWeights[i];
      if (r < cum) return statuses[i] as Shipment['currentStatus'];
    }
    return 'on_time';
  }

  return Array.from({ length: count }, (_, i) => {
    const origin = randomItem(SHIPPING_NODES);
    let destination = randomItem(SHIPPING_NODES);
    while (destination.id === origin.id) destination = randomItem(SHIPPING_NODES);

    const status = pickStatus();
    const delay = status === 'on_time' ? 0 : status === 'delayed' ? randomBetween(1, 8) : randomBetween(8, 48);
    const riskScore = status === 'critical' || status === 'disrupted'
      ? randomBetween(0.65, 1)
      : status === 'delayed'
      ? randomBetween(0.35, 0.65)
      : randomBetween(0, 0.35);

    // Interpolate current position between origin and destination
    const progress = Math.random();
    const currentCoords = {
      lat: origin.latitude + (destination.latitude - origin.latitude) * progress,
      lng: origin.longitude + (destination.longitude - origin.longitude) * progress,
    };

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
      priority: randomItem(['normal', 'urgent', 'time-sensitive']),
      riskScore,
      delay,
      route: [
        { lat: origin.latitude, lng: origin.longitude },
        currentCoords,
        { lat: destination.latitude, lng: destination.longitude },
      ],
    } as Shipment;
  });
}

// Generate mock disruptions
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
    } as Disruption;
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

// Generate 72-hour forecast time series
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

// Generate mock model performance
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

// Generate mock system health
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
