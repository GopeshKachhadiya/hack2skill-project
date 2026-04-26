import type { Node, Edge } from '../types';

export const MAP_TILES = {
  street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
};

export const MAP_ATTRIBUTIONS = {
  street: 'Â© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  satellite: 'Â© Esri, Â© OpenStreetMap contributors',
  terrain: 'Â© OpenStreetMap contributors, Â© SRTM',
};

export const STATUS_COLORS = {
  on_time: '#10b981',
  delayed: '#f59e0b',
  critical: '#ef4444',
  delivered: '#6b7280',
  disrupted: '#8b5cf6',
};

export const SEVERITY_COLORS = {
  low: '#22d3ee',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export const DISRUPTION_COLORS: Record<string, string> = {
  port_congestion: '#f97316',
  weather: '#3b82f6',
  traffic: '#f59e0b',
  mechanical: '#6b7280',
  customs: '#8b5cf6',
  geopolitical: '#ef4444',
};

export const CARGO_ICONS: Record<string, string> = {
  container: 'ðŸ“¦',
  bulk: 'ðŸ—ï¸',
  tanker: 'ðŸ›¢ï¸',
  air: 'âœˆï¸',
  truck: 'ðŸš›',
  refrigerated: 'ðŸ§Š',
};

// Default route optimization weights
export const DEFAULT_ROUTE_WEIGHTS = {
  distance: 1.0,
  delay: 2.0,
  disruption: 3.0,
  urgency: 0.5,
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

// Major global shipping nodes (ports, cities, warehouses)
export const SHIPPING_NODES: Node[] = [
  {
    id: 'shanghai',
    name: 'Port of Shanghai',
    latitude: 31.2304,
    longitude: 121.4737,
    type: 'port',
    properties: { baseDelay: 6, operationalCosts: 2500, capacity: 5000, country: 'China' },
  },
  {
    id: 'rotterdam',
    name: 'Port of Rotterdam',
    latitude: 51.9225,
    longitude: 4.4792,
    type: 'port',
    properties: { baseDelay: 4, operationalCosts: 3200, capacity: 4500, country: 'Netherlands' },
  },
  {
    id: 'singapore',
    name: 'Port of Singapore',
    latitude: 1.2966,
    longitude: 103.7764,
    type: 'port',
    properties: { baseDelay: 3, operationalCosts: 2800, capacity: 4800, country: 'Singapore' },
  },
  {
    id: 'losangeles',
    name: 'Port of Los Angeles',
    latitude: 33.7283,
    longitude: -118.2712,
    type: 'port',
    properties: { baseDelay: 8, operationalCosts: 3500, capacity: 3800, country: 'USA' },
  },
  {
    id: 'dubai',
    name: 'Port of Jebel Ali',
    latitude: 24.9857,
    longitude: 55.0272,
    type: 'port',
    properties: { baseDelay: 5, operationalCosts: 2200, capacity: 4000, country: 'UAE' },
  },
  {
    id: 'hamburg',
    name: 'Port of Hamburg',
    latitude: 53.5753,
    longitude: 9.9827,
    type: 'port',
    properties: { baseDelay: 5, operationalCosts: 3000, capacity: 3500, country: 'Germany' },
  },
  {
    id: 'busan',
    name: 'Port of Busan',
    latitude: 35.1796,
    longitude: 129.0756,
    type: 'port',
    properties: { baseDelay: 4, operationalCosts: 2400, capacity: 4200, country: 'South Korea' },
  },
  {
    id: 'hongkong',
    name: 'Port of Hong Kong',
    latitude: 22.3193,
    longitude: 114.1694,
    type: 'port',
    properties: { baseDelay: 4, operationalCosts: 3100, capacity: 3900, country: 'China' },
  },
  {
    id: 'antwerp',
    name: 'Port of Antwerp',
    latitude: 51.2213,
    longitude: 4.4051,
    type: 'port',
    properties: { baseDelay: 5, operationalCosts: 3100, capacity: 3600, country: 'Belgium' },
  },
  {
    id: 'mumbai',
    name: 'Port of Mumbai',
    latitude: 18.9388,
    longitude: 72.8354,
    type: 'port',
    properties: { baseDelay: 7, operationalCosts: 1800, capacity: 2800, country: 'India' },
  },
  {
    id: 'newyork',
    name: 'Port of New York',
    latitude: 40.6501,
    longitude: -74.0377,
    type: 'port',
    properties: { baseDelay: 6, operationalCosts: 3800, capacity: 3200, country: 'USA' },
  },
  {
    id: 'capetown',
    name: 'Port of Cape Town',
    latitude: -33.9249,
    longitude: 18.4241,
    type: 'port',
    properties: { baseDelay: 9, operationalCosts: 1500, capacity: 2000, country: 'South Africa' },
  },
  {
    id: 'suez',
    name: 'Suez Canal',
    latitude: 30.5852,
    longitude: 32.2654,
    type: 'city',
    properties: { baseDelay: 12, operationalCosts: 800, capacity: 10000, country: 'Egypt' },
  },
  {
    id: 'colombo',
    name: 'Port of Colombo',
    latitude: 6.9271,
    longitude: 79.8612,
    type: 'port',
    properties: { baseDelay: 5, operationalCosts: 1600, capacity: 2500, country: 'Sri Lanka' },
  },
  {
    id: 'felixstowe',
    name: 'Port of Felixstowe',
    latitude: 51.9659,
    longitude: 1.3516,
    type: 'port',
    properties: { baseDelay: 5, operationalCosts: 2900, capacity: 3000, country: 'UK' },
  },
  {
    id: 'panama',
    name: 'Panama Canal',
    latitude: 9.08,
    longitude: -79.68,
    type: 'city',
    properties: { baseDelay: 12, operationalCosts: 5000, capacity: 5000, country: 'Panama' },
  },
  {
    id: 'capegoodhope',
    name: 'Cape of Good Hope',
    latitude: -34.35,
    longitude: 18.47,
    type: 'city',
    properties: { baseDelay: 0, operationalCosts: 0, capacity: 100000, country: 'South Africa' },
  },
  // --- Maritime Waypoints (Straits and Passages) ---
  {
    id: 'hormuz',
    name: 'Strait of Hormuz',
    latitude: 26.57,
    longitude: 56.40,
    type: 'city',
    properties: { baseDelay: 4, operationalCosts: 0, capacity: 100000, country: 'International' },
  },
  {
    id: 'bab_el_mandeb',
    name: 'Bab-el-Mandeb',
    latitude: 12.60,
    longitude: 43.40,
    type: 'city',
    properties: { baseDelay: 6, operationalCosts: 0, capacity: 100000, country: 'International' },
  },
  {
    id: 'gibraltar',
    name: 'Strait of Gibraltar',
    latitude: 35.95,
    longitude: -5.46,
    type: 'city',
    properties: { baseDelay: 2, operationalCosts: 0, capacity: 100000, country: 'International' },
  },
  {
    id: 'malacca',
    name: 'Strait of Malacca',
    latitude: 2.30,
    longitude: 101.80,
    type: 'city',
    properties: { baseDelay: 4, operationalCosts: 0, capacity: 100000, country: 'International' },
  },
];

// Shipping edges (connections between ports)
export const SHIPPING_EDGES: Edge[] = [
  // Asia
  { from: 'shanghai', to: 'busan', distance: 1087, baseTime: 36, currentDelay: 2, disruptionRisk: 0.15, cost: 450, type: 'sea' },
  { from: 'shanghai', to: 'hongkong', distance: 1225, baseTime: 42, currentDelay: 0, disruptionRisk: 0.1, cost: 380, type: 'sea' },
  { from: 'hongkong', to: 'malacca', distance: 2500, baseTime: 72, currentDelay: 1, disruptionRisk: 0.1, cost: 400, type: 'sea' },
  { from: 'malacca', to: 'singapore', distance: 300, baseTime: 8, currentDelay: 1, disruptionRisk: 0.05, cost: 100, type: 'sea' },
  { from: 'singapore', to: 'colombo', distance: 1600, baseTime: 48, currentDelay: 2, disruptionRisk: 0.12, cost: 420, type: 'sea' },
  { from: 'colombo', to: 'mumbai', distance: 1400, baseTime: 40, currentDelay: 1, disruptionRisk: 0.1, cost: 250, type: 'sea' },
  
  // Middle East & Red Sea (Fixing the "Land Clip" over Saudi Arabia)
  { from: 'mumbai', to: 'hormuz', distance: 1800, baseTime: 50, currentDelay: 2, disruptionRisk: 0.2, cost: 350, type: 'sea' },
  { from: 'hormuz', to: 'dubai', distance: 150, baseTime: 4, currentDelay: 1, disruptionRisk: 0.1, cost: 50, type: 'sea' },
  { from: 'dubai', to: 'hormuz', distance: 150, baseTime: 4, currentDelay: 1, disruptionRisk: 0.1, cost: 50, type: 'sea' },
  { from: 'hormuz', to: 'bab_el_mandeb', distance: 2800, baseTime: 80, currentDelay: 4, disruptionRisk: 0.3, cost: 600, type: 'sea' },
  { from: 'colombo', to: 'bab_el_mandeb', distance: 3500, baseTime: 100, currentDelay: 3, disruptionRisk: 0.25, cost: 700, type: 'sea' },
  { from: 'bab_el_mandeb', to: 'suez', distance: 2100, baseTime: 60, currentDelay: 2, disruptionRisk: 0.2, cost: 400, type: 'sea' },
  
  // Europe
  { from: 'suez', to: 'rotterdam', distance: 5900, baseTime: 144, currentDelay: 0, disruptionRisk: 0.12, cost: 850, type: 'sea' },
  { from: 'rotterdam', to: 'gibraltar', distance: 2500, baseTime: 70, currentDelay: 1, disruptionRisk: 0.05, cost: 400, type: 'sea' },
  { from: 'gibraltar', to: 'suez', distance: 3400, baseTime: 96, currentDelay: 2, disruptionRisk: 0.15, cost: 500, type: 'sea' },
  { from: 'rotterdam', to: 'hamburg', distance: 370, baseTime: 12, currentDelay: 1, disruptionRisk: 0.08, cost: 200, type: 'sea' },
  { from: 'rotterdam', to: 'antwerp', distance: 80, baseTime: 4, currentDelay: 0, disruptionRisk: 0.05, cost: 120, type: 'sea' },
  { from: 'rotterdam', to: 'felixstowe', distance: 450, baseTime: 18, currentDelay: 2, disruptionRisk: 0.1, cost: 280, type: 'sea' },
  
  // Americas
  { from: 'losangeles', to: 'panama', distance: 4800, baseTime: 140, currentDelay: 4, disruptionRisk: 0.1, cost: 800, type: 'sea' },
  { from: 'panama', to: 'newyork', distance: 3800, baseTime: 110, currentDelay: 2, disruptionRisk: 0.08, cost: 700, type: 'sea' },
  { from: 'shanghai', to: 'losangeles', distance: 9620, baseTime: 336, currentDelay: 8, disruptionRisk: 0.22, cost: 1400, type: 'sea' },
  { from: 'busan', to: 'losangeles', distance: 8800, baseTime: 312, currentDelay: 6, disruptionRisk: 0.18, cost: 1300, type: 'sea' },
  
  // Around Africa (Bypass)
  { from: 'mumbai', to: 'capegoodhope', distance: 8500, baseTime: 240, currentDelay: 0, disruptionRisk: 0.1, cost: 1100, type: 'sea' },
  { from: 'singapore', to: 'capegoodhope', distance: 10500, baseTime: 300, currentDelay: 0, disruptionRisk: 0.1, cost: 1300, type: 'sea' },
  { from: 'capegoodhope', to: 'rotterdam', distance: 9650, baseTime: 288, currentDelay: 0, disruptionRisk: 0.15, cost: 1100, type: 'sea' },
  { from: 'capegoodhope', to: 'gibraltar', distance: 8800, baseTime: 260, currentDelay: 0, disruptionRisk: 0.1, cost: 1000, type: 'sea' },
];

