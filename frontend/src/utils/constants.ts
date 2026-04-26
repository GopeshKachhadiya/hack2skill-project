import type { Node, Edge, Coordinate } from '../types';

export const MAP_TILES = {
  street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
};

export const MAP_ATTRIBUTIONS = {
  street: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  satellite: '&copy; Esri, &copy; OpenStreetMap contributors',
  terrain: '&copy; OpenStreetMap contributors, &copy; SRTM',
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
  container: 'Package',
  bulk: 'Bulk',
  tanker: 'Tanker',
  air: 'Air',
  truck: 'Truck',
  refrigerated: 'Cold',
};

export const DEFAULT_ROUTE_WEIGHTS = {
  distance: 1.0,
  delay: 2.0,
  disruption: 3.0,
  urgency: 0.5,
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

const portNode = (
  id: string,
  name: string,
  latitude: number,
  longitude: number,
  country: string,
  baseDelay: number,
  operationalCosts: number,
  capacity: number
): Node => ({
  id,
  name,
  latitude,
  longitude,
  type: 'port',
  properties: { baseDelay, operationalCosts, capacity, country },
});

const seaNode = (id: string, name: string, latitude: number, longitude: number): Node => ({
  id,
  name,
  latitude,
  longitude,
  type: 'city',
  properties: { baseDelay: 1, operationalCosts: 400, capacity: 9999, country: 'International Waters' },
});

export const SHIPPING_NODES: Node[] = [
  portNode('shanghai', 'Port of Shanghai', 31.2304, 121.4737, 'China', 6, 2500, 5000),
  portNode('rotterdam', 'Port of Rotterdam', 51.9225, 4.4792, 'Netherlands', 4, 3200, 4500),
  portNode('singapore', 'Port of Singapore', 1.2966, 103.7764, 'Singapore', 3, 2800, 4800),
  portNode('losangeles', 'Port of Los Angeles', 33.7283, -118.2712, 'USA', 8, 3500, 3800),
  portNode('dubai', 'Port of Jebel Ali', 24.9857, 55.0272, 'UAE', 5, 2200, 4000),
  portNode('hamburg', 'Port of Hamburg', 53.5753, 9.9827, 'Germany', 5, 3000, 3500),
  portNode('busan', 'Port of Busan', 35.1796, 129.0756, 'South Korea', 4, 2400, 4200),
  portNode('hongkong', 'Port of Hong Kong', 22.3193, 114.1694, 'China', 4, 3100, 3900),
  portNode('antwerp', 'Port of Antwerp', 51.2213, 4.4051, 'Belgium', 5, 3100, 3600),
  portNode('mumbai', 'Port of Mumbai', 18.9388, 72.8354, 'India', 7, 1800, 2800),
  portNode('newyork', 'Port of New York', 40.6501, -74.0377, 'USA', 6, 3800, 3200),
  portNode('capetown', 'Port of Cape Town', -33.9249, 18.4241, 'South Africa', 9, 1500, 2000),
  portNode('colombo', 'Port of Colombo', 6.9271, 79.8612, 'Sri Lanka', 5, 1600, 2500),
  portNode('felixstowe', 'Port of Felixstowe', 51.9659, 1.3516, 'UK', 5, 2900, 3000),
  seaNode('yellow_sea', 'Yellow Sea Corridor', 31.8, 124.5),
  seaNode('east_china_sea', 'East China Sea Corridor', 27.5, 123.8),
  seaNode('taiwan_strait', 'Taiwan Strait', 23.8, 119.8),
  seaNode('south_china_sea', 'South China Sea Corridor', 15.5, 113.5),
  seaNode('malacca_strait', 'Strait of Malacca', 4.5, 99.5),
  seaNode('indian_ocean_east', 'Eastern Indian Ocean', 7.0, 88.5),
  seaNode('indian_ocean_central', 'Central Indian Ocean', 11.0, 74.5),
  seaNode('arabian_sea', 'Arabian Sea', 17.0, 63.0),
  seaNode('gulf_of_oman', 'Gulf of Oman', 23.5, 60.0),
  seaNode('gulf_of_aden', 'Gulf of Aden', 13.0, 49.0),
  seaNode('bab_el_mandeb', 'Bab el-Mandeb', 12.7, 43.4),
  seaNode('red_sea_mid', 'Central Red Sea', 20.5, 38.5),
  seaNode('suez_canal', 'Suez Canal', 30.5852, 32.2654),
  seaNode('med_east', 'Eastern Mediterranean', 33.8, 28.0),
  seaNode('ionian_sea', 'Ionian Sea', 36.0, 19.0),
  seaNode('sicily_channel', 'Sicily Channel', 36.2, 13.0),
  seaNode('western_med', 'Western Mediterranean', 37.0, 1.5),
  seaNode('alboran_sea', 'Alboran Sea', 36.0, -4.0),
  seaNode('gibraltar', 'Strait of Gibraltar', 35.95, -5.6),
  seaNode('atlantic_iberia', 'Atlantic off Iberia', 41.0, -9.8),
  seaNode('bay_of_biscay', 'Bay of Biscay', 45.5, -6.0),
  seaNode('english_channel', 'English Channel', 50.3, -1.5),
  seaNode('north_sea', 'North Sea', 53.5, 3.2),
  seaNode('cape_lane', 'Cape Sea Lane', -34.5, 16.0),
  seaNode('north_pacific_west', 'North Pacific West', 36.5, 150.0),
  seaNode('north_pacific_central', 'North Pacific Central', 37.0, 178.0),
  seaNode('north_pacific_east', 'North Pacific East', 33.5, -145.0),
  seaNode('panama_pacific', 'Panama Pacific Approach', 8.6, -80.8),
  seaNode('panama_canal', 'Panama Canal', 9.2, -79.6),
  seaNode('caribbean', 'Caribbean Sea', 16.0, -76.5),
  seaNode('north_atlantic_west', 'Western North Atlantic', 33.0, -70.0),
];

const nodeMap = Object.fromEntries(SHIPPING_NODES.map((node) => [node.id, node])) as Record<string, Node>;

const pathFromIds = (...ids: string[]): Coordinate[] =>
  ids.map((id) => ({ lat: nodeMap[id].latitude, lng: nodeMap[id].longitude }));

const seaEdge = (
  from: string,
  to: string,
  distance: number,
  baseTime: number,
  currentDelay: number,
  disruptionRisk: number,
  cost: number,
  ...pathIds: string[]
): Edge => ({
  from,
  to,
  distance,
  baseTime,
  currentDelay,
  disruptionRisk,
  cost,
  mode: 'sea',
  path: pathFromIds(...(pathIds.length > 0 ? pathIds : [from, to])),
});

const landEdge = (
  from: string,
  to: string,
  distance: number,
  baseTime: number,
  currentDelay: number,
  disruptionRisk: number,
  cost: number
): Edge => ({
  from,
  to,
  distance,
  baseTime,
  currentDelay,
  disruptionRisk,
  cost,
  mode: 'land',
});

export const SHIPPING_EDGES: Edge[] = [
  seaEdge('shanghai', 'yellow_sea', 420, 14, 1, 0.08, 180, 'shanghai', 'yellow_sea'),
  seaEdge('busan', 'yellow_sea', 620, 18, 1, 0.09, 220, 'busan', 'yellow_sea'),
  seaEdge('yellow_sea', 'east_china_sea', 520, 16, 1, 0.08, 170, 'yellow_sea', 'east_china_sea'),
  seaEdge('hongkong', 'taiwan_strait', 700, 22, 1, 0.1, 230, 'hongkong', 'taiwan_strait'),
  seaEdge('east_china_sea', 'taiwan_strait', 640, 20, 1, 0.09, 210, 'east_china_sea', 'taiwan_strait'),
  seaEdge('taiwan_strait', 'south_china_sea', 1100, 34, 2, 0.11, 320, 'taiwan_strait', 'south_china_sea'),
  seaEdge('south_china_sea', 'malacca_strait', 1700, 52, 3, 0.14, 430, 'south_china_sea', 'malacca_strait'),
  seaEdge('singapore', 'malacca_strait', 220, 8, 1, 0.07, 120, 'singapore', 'malacca_strait'),
  seaEdge('malacca_strait', 'indian_ocean_east', 1500, 46, 2, 0.12, 380, 'malacca_strait', 'indian_ocean_east'),
  seaEdge('colombo', 'indian_ocean_east', 980, 30, 2, 0.12, 260, 'colombo', 'indian_ocean_east'),
  seaEdge('indian_ocean_east', 'indian_ocean_central', 1550, 46, 2, 0.1, 360, 'indian_ocean_east', 'indian_ocean_central'),
  seaEdge('mumbai', 'indian_ocean_central', 980, 28, 2, 0.12, 250, 'mumbai', 'indian_ocean_central'),
  seaEdge('indian_ocean_central', 'arabian_sea', 1200, 36, 2, 0.11, 310, 'indian_ocean_central', 'arabian_sea'),
  seaEdge('arabian_sea', 'gulf_of_oman', 900, 28, 2, 0.12, 240, 'arabian_sea', 'gulf_of_oman'),
  seaEdge('dubai', 'gulf_of_oman', 620, 20, 2, 0.13, 220, 'dubai', 'gulf_of_oman'),
  seaEdge('arabian_sea', 'gulf_of_aden', 1500, 46, 2, 0.16, 390, 'arabian_sea', 'gulf_of_aden'),
  seaEdge('gulf_of_aden', 'bab_el_mandeb', 620, 18, 1, 0.16, 200, 'gulf_of_aden', 'bab_el_mandeb'),
  seaEdge('bab_el_mandeb', 'red_sea_mid', 1180, 36, 2, 0.16, 290, 'bab_el_mandeb', 'red_sea_mid'),
  seaEdge('red_sea_mid', 'suez_canal', 1450, 44, 2, 0.17, 340, 'red_sea_mid', 'suez_canal'),
  seaEdge('suez_canal', 'med_east', 520, 16, 1, 0.12, 170, 'suez_canal', 'med_east'),
  seaEdge('med_east', 'ionian_sea', 980, 30, 1, 0.1, 240, 'med_east', 'ionian_sea'),
  seaEdge('ionian_sea', 'sicily_channel', 780, 24, 1, 0.09, 210, 'ionian_sea', 'sicily_channel'),
  seaEdge('sicily_channel', 'western_med', 920, 28, 1, 0.09, 240, 'sicily_channel', 'western_med'),
  seaEdge('western_med', 'alboran_sea', 820, 24, 1, 0.09, 220, 'western_med', 'alboran_sea'),
  seaEdge('alboran_sea', 'gibraltar', 260, 8, 1, 0.08, 100, 'alboran_sea', 'gibraltar'),
  seaEdge('gibraltar', 'atlantic_iberia', 760, 24, 1, 0.08, 210, 'gibraltar', 'atlantic_iberia'),
  seaEdge('atlantic_iberia', 'bay_of_biscay', 980, 30, 1, 0.08, 250, 'atlantic_iberia', 'bay_of_biscay'),
  seaEdge('bay_of_biscay', 'english_channel', 880, 26, 1, 0.08, 230, 'bay_of_biscay', 'english_channel'),
  seaEdge('english_channel', 'north_sea', 520, 16, 1, 0.07, 160, 'english_channel', 'north_sea'),
  seaEdge('rotterdam', 'north_sea', 180, 6, 1, 0.05, 100, 'rotterdam', 'north_sea'),
  seaEdge('hamburg', 'north_sea', 420, 14, 1, 0.06, 150, 'hamburg', 'north_sea'),
  seaEdge('antwerp', 'north_sea', 220, 8, 1, 0.05, 110, 'antwerp', 'north_sea'),
  seaEdge('felixstowe', 'english_channel', 260, 8, 1, 0.06, 110, 'felixstowe', 'english_channel'),
  seaEdge('capetown', 'cape_lane', 120, 4, 1, 0.08, 90, 'capetown', 'cape_lane'),
  seaEdge('cape_lane', 'indian_ocean_central', 4200, 132, 3, 0.14, 900, 'cape_lane', 'indian_ocean_central'),
  seaEdge('cape_lane', 'atlantic_iberia', 5100, 160, 3, 0.12, 1040, 'cape_lane', 'atlantic_iberia'),
  seaEdge('losangeles', 'north_pacific_east', 1500, 46, 2, 0.12, 380, 'losangeles', 'north_pacific_east'),
  seaEdge('north_pacific_east', 'north_pacific_central', 2700, 82, 2, 0.11, 620, 'north_pacific_east', 'north_pacific_central'),
  seaEdge('north_pacific_central', 'north_pacific_west', 2500, 76, 2, 0.1, 580, 'north_pacific_central', 'north_pacific_west'),
  seaEdge('north_pacific_west', 'east_china_sea', 2500, 76, 2, 0.11, 590, 'north_pacific_west', 'east_china_sea'),
  seaEdge('north_pacific_east', 'panama_pacific', 4300, 132, 3, 0.13, 960, 'north_pacific_east', 'panama_pacific'),
  seaEdge('panama_pacific', 'panama_canal', 140, 6, 1, 0.1, 90, 'panama_pacific', 'panama_canal'),
  seaEdge('panama_canal', 'caribbean', 220, 8, 1, 0.1, 100, 'panama_canal', 'caribbean'),
  seaEdge('caribbean', 'north_atlantic_west', 1650, 50, 2, 0.1, 400, 'caribbean', 'north_atlantic_west'),
  seaEdge('newyork', 'north_atlantic_west', 980, 30, 2, 0.08, 260, 'newyork', 'north_atlantic_west'),
  seaEdge('north_atlantic_west', 'atlantic_iberia', 4200, 128, 3, 0.11, 940, 'north_atlantic_west', 'atlantic_iberia'),
  landEdge('losangeles', 'newyork', 5200, 312, 12, 0.2, 1200),
];

export const PORT_OPTIONS = SHIPPING_NODES.filter((node) => node.type === 'port');
