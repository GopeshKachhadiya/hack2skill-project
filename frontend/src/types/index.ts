// ============================================================
// TypeScript Types & Interfaces for Supply Chain Platform
// Developer 2: Frontend & Route Optimization Engineer
// ============================================================

export interface Coordinate {
  lat: number;
  lng: number;
}

export type RouteMode = 'multimodal' | 'sea';

export interface Node {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: 'port' | 'city' | 'warehouse' | 'airport';
  properties: {
    baseDelay: number; // hours
    operationalCosts: number; // $/day
    capacity: number; // containers/day
    country: string;
  };
}

export interface Edge {
  from: string;
  to: string;
  distance: number; // km
  baseTime: number; // hours
  currentDelay: number; // hours
  disruptionRisk: number; // 0-1
  cost: number; // $/ton
  mode?: 'sea' | 'land';
  path?: Coordinate[];
}

export type ShipmentStatus =
  | 'on_time'
  | 'delayed'
  | 'critical'
  | 'delivered'
  | 'disrupted';

export interface Shipment {
  id: string;
  origin: string;
  destination: string;
  originCoords: Coordinate;
  destinationCoords: Coordinate;
  currentCoords: Coordinate;
  departureTime: string;
  expectedArrival: string;
  currentStatus: ShipmentStatus;
  cargoType: string;
  cargoValue: number;
  priority: 'normal' | 'urgent' | 'time-sensitive';
  riskScore: number; // 0-1
  delay: number; // hours
  route?: Coordinate[];
}

export type DisruptionType =
  | 'port_congestion'
  | 'weather'
  | 'traffic'
  | 'mechanical'
  | 'customs'
  | 'geopolitical';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Disruption {
  id: string;
  location: string;
  coords: Coordinate;
  disruptionType: DisruptionType;
  predictedSeverity: number; // 0-1
  probability: number; // 0-1
  predictedTimeWindow: {
    start: string;
    end: string;
  };
  confidenceScore: number; // 0-1
  recommendedAction: string;
  affectedShipments: number;
  radius: number; // km
  status: 'active' | 'resolved';
}

export interface RouteConstraints {
  timeWindow?: {
    earliest: string;
    latest: string;
  };
  maxCost?: number;
  cargoType?: string;
  riskTolerance?: number; // 0-100
  priority?: 'balanced' | 'fastest' | 'cheapest' | 'safest';
}

export interface Route {
  nodeIds: string[];
  waypoints: Node[];
  totalDistance: number; // km
  totalTime: number; // hours
  totalCost: number; // $
  riskScore: number; // 0-100
  stops: number;
}

export interface RouteOptimizationResult {
  originalRoute: Route;
  optimizedRoute: Route;
  timeSaved: number; // hours
  costSaved: number; // $
  riskReduction: number; // 0-100
  recommendations: string[];
}

export interface ForecastDataPoint {
  timestamp: string;
  disruptionLikelihood: number;
  disruptionLikelihoodUpper: number;
  disruptionLikelihoodLower: number;
  weatherSeverity: number;
  trafficIndex: number;
}

export interface ForecastSeries {
  location: string;
  forecastGeneratedAt: string;
  data: ForecastDataPoint[];
}

export interface ModelPerformanceMetrics {
  modelAccuracy: {
    precision: number;
    recall: number;
    f1Score: number;
    mape: number;
  };
  coverage: {
    avgHoursToDisruption: number;
    totalDisruptionsPredicted: number;
    correctPredictions: number;
    falsePositives: number;
  };
  lastRetrained: string;
  nextRetraining: string;
}

export interface AlertNotification {
  id: string;
  type: 'new' | 'updated' | 'resolved';
  disruption: Disruption;
  timestamp: string;
  read: boolean;
}

export interface SystemHealth {
  backendApi: {
    status: 'online' | 'offline' | 'degraded';
    responseTime: number;
  };
  database: {
    status: 'online' | 'offline';
    latency: number;
  };
  websocket: {
    connected: boolean;
    latency: number;
  };
  dataSources: {
    weather: { lastUpdate: string; status: string };
    traffic: { lastUpdate: string; status: string };
    port: { lastUpdate: string; status: string };
  };
  overallHealth: number; // 0-100
}

export interface AStarNode {
  id: string;
  gScore: number;
  fScore: number;
  parent: AStarNode | null;
}

export interface UserPreferences {
  routeWeights: {
    distance: number;
    delay: number;
    disruption: number;
    urgency: number;
  };
  notifications: {
    disruptions: boolean;
    shipmentUpdates: boolean;
    sound: boolean;
  };
  mapStyle: 'street' | 'satellite' | 'terrain';
}
