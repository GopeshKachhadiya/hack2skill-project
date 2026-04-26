import type { Coordinate, Edge, Node } from '../types';
import { Graph } from './astar';
import { haversineDistance, nodeToCoord } from './geo';

type Polygon = Coordinate[];

const SEA_SPEED_KMH = 32;

function seaNode(id: string, name: string, latitude: number, longitude: number): Node {
  return {
    id,
    name,
    latitude,
    longitude,
    type: 'city',
    properties: {
      baseDelay: 1,
      operationalCosts: 400,
      capacity: 9999,
      country: 'International Waters',
    },
  };
}

const MARITIME_WAYPOINTS: Node[] = [
  seaNode('yellow_sea_lane', 'Yellow Sea Lane', 33.7, 124.8),
  seaNode('east_china_sea_lane', 'East China Sea Lane', 29.2, 123.5),
  seaNode('taiwan_strait_lane', 'Taiwan Strait Lane', 24.1, 119.7),
  seaNode('south_china_sea_north', 'North South China Sea', 18.4, 114.2),
  seaNode('south_china_sea_south', 'South South China Sea', 9.7, 108.2),
  seaNode('singapore_strait_lane', 'Singapore Strait Lane', 1.3, 104.3),
  seaNode('malacca_lane', 'Malacca Strait Lane', 4.5, 99.8),
  seaNode('andaman_lane', 'Andaman Sea Lane', 10.5, 95.0),
  seaNode('bay_of_bengal_lane', 'Bay of Bengal Lane', 13.5, 86.0),
  seaNode('sri_lanka_south_lane', 'South of Sri Lanka Lane', 5.6, 81.5),
  seaNode('arabian_sea_lane', 'Arabian Sea Lane', 16.5, 66.0),
  seaNode('gulf_of_oman_lane', 'Gulf of Oman Lane', 22.8, 60.2),
  seaNode('oman_approach_lane', 'Oman Approach Lane', 24.2, 58.8),
  seaNode('gulf_of_aden_lane', 'Gulf of Aden Lane', 13.2, 49.2),
  seaNode('red_sea_south_lane', 'South Red Sea Lane', 18.0, 40.0),
  seaNode('red_sea_north_lane', 'North Red Sea Lane', 24.5, 35.5),
  seaNode('suez_lane', 'Suez Canal Lane', 30.6, 32.3),
  seaNode('east_med_lane', 'Eastern Mediterranean Lane', 33.8, 28.0),
  seaNode('central_med_lane', 'Central Mediterranean Lane', 35.8, 18.0),
  seaNode('west_med_lane', 'Western Mediterranean Lane', 36.8, 6.0),
  seaNode('gibraltar_lane', 'Gibraltar Lane', 35.95, -5.7),
  seaNode('iberia_atlantic_lane', 'Iberia Atlantic Lane', 41.0, -10.2),
  seaNode('bay_biscay_lane', 'Bay of Biscay Lane', 46.0, -7.2),
  seaNode('english_channel_lane', 'English Channel Lane', 50.2, -1.4),
  seaNode('north_sea_lane', 'North Sea Lane', 53.1, 3.1),
  seaNode('west_africa_north_lane', 'West Africa North Lane', 21.5, -17.0),
  seaNode('west_africa_mid_lane', 'West Africa Mid Lane', 6.0, -11.5),
  seaNode('west_africa_south_lane', 'West Africa South Lane', -12.0, 1.5),
  seaNode('namibia_lane', 'Namibia Offshore Lane', -24.0, 11.0),
  seaNode('cape_lane', 'Cape of Good Hope Lane', -34.4, 17.8),
  seaNode('mozambique_lane', 'Mozambique Channel Lane', -21.0, 39.5),
  seaNode('somali_basin_lane', 'Somali Basin Lane', -4.5, 52.0),
  seaNode('north_pacific_west_lane', 'North Pacific West Lane', 34.5, 150.0),
  seaNode('north_pacific_mid_lane', 'North Pacific Mid Lane', 35.0, 176.0),
  seaNode('north_pacific_east_lane', 'North Pacific East Lane', 33.0, -150.0),
  seaNode('baja_lane', 'Baja Offshore Lane', 27.0, -118.0),
  seaNode('panama_pacific_lane', 'Panama Pacific Lane', 8.8, -81.0),
  seaNode('panama_canal_lane', 'Panama Canal Lane', 9.2, -79.6),
  seaNode('caribbean_lane', 'Caribbean Lane', 16.0, -76.0),
  seaNode('north_atlantic_west_lane', 'Western North Atlantic Lane', 31.0, -68.0),
  seaNode('mid_atlantic_lane', 'Mid Atlantic Lane', 34.0, -42.0),
  seaNode('azores_lane', 'Azores Lane', 38.0, -28.0),
];

const LAND_POLYGONS: Polygon[] = [
  [
    { lat: 71, lng: -168 }, { lat: 60, lng: -150 }, { lat: 50, lng: -130 }, { lat: 42, lng: -124 },
    { lat: 32, lng: -117 }, { lat: 20, lng: -106 }, { lat: 10, lng: -97 }, { lat: 9, lng: -81 },
    { lat: 18, lng: -79 }, { lat: 26, lng: -81 }, { lat: 34, lng: -77 }, { lat: 45, lng: -66 },
    { lat: 53, lng: -58 }, { lat: 60, lng: -62 }, { lat: 67, lng: -76 }, { lat: 72, lng: -95 },
    { lat: 73, lng: -120 }, { lat: 71, lng: -168 },
  ],
  [
    { lat: 12, lng: -81 }, { lat: 9, lng: -72 }, { lat: -5, lng: -77 }, { lat: -18, lng: -71 }, { lat: -34, lng: -73 },
    { lat: -53, lng: -69 }, { lat: -55, lng: -64 }, { lat: -49, lng: -53 }, { lat: -35, lng: -47 }, { lat: -20, lng: -40 },
    { lat: -5, lng: -35 }, { lat: 5, lng: -51 }, { lat: 10, lng: -61 }, { lat: 12, lng: -81 },
  ],
  [
    { lat: 72, lng: -10 }, { lat: 70, lng: 20 }, { lat: 64, lng: 40 }, { lat: 58, lng: 45 }, { lat: 52, lng: 30 },
    { lat: 46, lng: 15 }, { lat: 43, lng: 0 }, { lat: 45, lng: -8 }, { lat: 51, lng: -6 }, { lat: 58, lng: -6 },
    { lat: 65, lng: -10 }, { lat: 72, lng: -10 },
  ],
  [
    { lat: 37, lng: -9 }, { lat: 36, lng: -1 }, { lat: 35, lng: 10 }, { lat: 32, lng: 21 }, { lat: 31, lng: 32 },
    { lat: 29, lng: 34 }, { lat: 20, lng: 37 }, { lat: 11, lng: 43 }, { lat: 4, lng: 43 }, { lat: -5, lng: 41 },
    { lat: -18, lng: 40 }, { lat: -29, lng: 32 }, { lat: -35, lng: 20 }, { lat: -34, lng: 11 }, { lat: -28, lng: 6 },
    { lat: -17, lng: 11 }, { lat: -5, lng: 12 }, { lat: 5, lng: 3 }, { lat: 14, lng: -17 }, { lat: 29, lng: -13 },
    { lat: 35, lng: -8 }, { lat: 37, lng: -9 },
  ],
  [
    { lat: 31, lng: 32 }, { lat: 32, lng: 35 }, { lat: 31, lng: 40 }, { lat: 27, lng: 49 }, { lat: 24, lng: 55 },
    { lat: 20, lng: 58 }, { lat: 14, lng: 55 }, { lat: 12, lng: 50 }, { lat: 15, lng: 43 }, { lat: 20, lng: 38 },
    { lat: 27, lng: 34 }, { lat: 31, lng: 32 },
  ],
  [
    { lat: 24, lng: 61 }, { lat: 22, lng: 68 }, { lat: 20, lng: 72 }, { lat: 17, lng: 73 }, { lat: 13, lng: 80 },
    { lat: 9, lng: 78 }, { lat: 8, lng: 74 }, { lat: 12, lng: 71 }, { lat: 20, lng: 65 }, { lat: 24, lng: 61 },
  ],
  [
    { lat: 24, lng: 97 }, { lat: 20, lng: 106 }, { lat: 14, lng: 109 }, { lat: 9, lng: 105 }, { lat: 2, lng: 101 },
    { lat: 1, lng: 103 }, { lat: 4, lng: 104 }, { lat: 8, lng: 102 }, { lat: 15, lng: 98 }, { lat: 24, lng: 97 },
  ],
  [
    { lat: 41, lng: 119 }, { lat: 39, lng: 122 }, { lat: 33, lng: 122 }, { lat: 25, lng: 120 }, { lat: 20, lng: 110 },
    { lat: 24, lng: 105 }, { lat: 31, lng: 109 }, { lat: 38, lng: 117 }, { lat: 41, lng: 119 },
  ],
  [
    { lat: 38, lng: 126 }, { lat: 36, lng: 129 }, { lat: 34, lng: 129 }, { lat: 34, lng: 126 }, { lat: 38, lng: 126 },
  ],
  [
    { lat: 46, lng: 130 }, { lat: 44, lng: 145 }, { lat: 36, lng: 141 }, { lat: 31, lng: 130 }, { lat: 30, lng: 122 },
    { lat: 37, lng: 126 }, { lat: 43, lng: 132 }, { lat: 46, lng: 130 },
  ],
  [
    { lat: -11, lng: 141 }, { lat: -19, lng: 147 }, { lat: -28, lng: 153 }, { lat: -39, lng: 146 }, { lat: -34, lng: 116 },
    { lat: -20, lng: 115 }, { lat: -12, lng: 130 }, { lat: -11, lng: 141 },
  ],
];

const waypointMap = new Map(MARITIME_WAYPOINTS.map((node) => [node.id, node] as const));

type RouteDefinition = {
  from: string;
  to: string;
  path: Coordinate[];
  risk?: number;
};

const coords = (...points: [number, number][]): Coordinate[] =>
  points.map(([lat, lng]) => ({ lat, lng }));

function normalizeLng(lng: number, reference: number): number {
  let value = lng;
  while (value - reference > 180) value -= 360;
  while (value - reference < -180) value += 360;
  return value;
}

function projectForSegment(point: Coordinate, reference: number): Coordinate {
  return { lat: point.lat, lng: normalizeLng(point.lng, reference) };
}

function orientation(a: Coordinate, b: Coordinate, c: Coordinate): number {
  return (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
}

function onSegment(a: Coordinate, b: Coordinate, c: Coordinate): boolean {
  return (
    Math.min(a.lng, c.lng) <= b.lng &&
    b.lng <= Math.max(a.lng, c.lng) &&
    Math.min(a.lat, c.lat) <= b.lat &&
    b.lat <= Math.max(a.lat, c.lat)
  );
}

function segmentsIntersect(a1: Coordinate, a2: Coordinate, b1: Coordinate, b2: Coordinate): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (o1 === 0 && onSegment(a1, b1, a2)) return true;
  if (o2 === 0 && onSegment(a1, b2, a2)) return true;
  if (o3 === 0 && onSegment(b1, a1, b2)) return true;
  if (o4 === 0 && onSegment(b1, a2, b2)) return true;

  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

function pointInPolygon(point: Coordinate, polygon: Polygon): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function segmentCrossesPolygon(start: Coordinate, end: Coordinate, polygon: Polygon): boolean {
  const reference = (start.lng + end.lng) / 2;
  const adjustedStart = projectForSegment(start, reference);
  const adjustedEnd = projectForSegment(end, reference);
  const adjustedPolygon = polygon.map((point) => projectForSegment(point, reference));

  for (let index = 0; index < adjustedPolygon.length; index += 1) {
    const current = adjustedPolygon[index];
    const next = adjustedPolygon[(index + 1) % adjustedPolygon.length];
    if (segmentsIntersect(adjustedStart, adjustedEnd, current, next)) {
      return true;
    }
  }

  const midpoint = {
    lat: (adjustedStart.lat + adjustedEnd.lat) / 2,
    lng: (adjustedStart.lng + adjustedEnd.lng) / 2,
  };

  return pointInPolygon(midpoint, adjustedPolygon);
}

function pathCrossesLand(path: Coordinate[]): boolean {
  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const end = path[index + 1];
    if (LAND_POLYGONS.some((polygon) => segmentCrossesPolygon(start, end, polygon))) {
      return true;
    }
  }

  return false;
}

function pathFromIds(...ids: string[]): Coordinate[] {
  return ids.map((id) => nodeToCoord(waypointMap.get(id)!));
}

const MARITIME_BACKBONE: RouteDefinition[] = [
  { from: 'yellow_sea_lane', to: 'east_china_sea_lane', path: pathFromIds('yellow_sea_lane', 'east_china_sea_lane') },
  {
    from: 'east_china_sea_lane',
    to: 'taiwan_strait_lane',
    path: coords([29.2, 123.5], [27.8, 122.9], [26.2, 121.8], [24.1, 119.7]),
  },
  {
    from: 'taiwan_strait_lane',
    to: 'south_china_sea_north',
    path: coords([24.1, 119.7], [22.0, 118.6], [20.1, 116.8], [18.4, 114.2]),
  },
  {
    from: 'south_china_sea_north',
    to: 'south_china_sea_south',
    path: coords([18.4, 114.2], [15.5, 113.0], [12.5, 111.2], [9.7, 108.2]),
  },
  {
    from: 'south_china_sea_south',
    to: 'singapore_strait_lane',
    path: coords(
      [9.7, 108.2],
      [7.9, 107.0],
      [6.1, 105.8],
      [4.3, 104.8],
      [2.6, 104.4],
      [1.3, 104.3]
    ),
    risk: 0.14,
  },
  {
    from: 'singapore_strait_lane',
    to: 'malacca_lane',
    path: coords([1.3, 104.3], [1.5, 103.4], [2.3, 102.0], [3.2, 100.8], [4.5, 99.8]),
    risk: 0.14,
  },
  {
    from: 'malacca_lane',
    to: 'andaman_lane',
    path: coords([4.5, 99.8], [6.0, 97.4], [8.2, 95.9], [10.5, 95.0]),
    risk: 0.14,
  },
  {
    from: 'andaman_lane',
    to: 'bay_of_bengal_lane',
    path: coords([10.5, 95.0], [11.8, 92.2], [12.8, 89.0], [13.5, 86.0]),
  },
  {
    from: 'bay_of_bengal_lane',
    to: 'sri_lanka_south_lane',
    path: coords([13.5, 86.0], [11.8, 84.8], [9.8, 83.7], [7.9, 82.6], [5.6, 81.5]),
  },
  {
    from: 'sri_lanka_south_lane',
    to: 'arabian_sea_lane',
    path: coords([5.6, 81.5], [5.2, 78.5], [5.7, 75.2], [7.4, 71.5], [10.5, 68.5], [16.5, 66.0]),
  },
  { from: 'arabian_sea_lane', to: 'gulf_of_oman_lane', path: pathFromIds('arabian_sea_lane', 'gulf_of_oman_lane') },
  {
    from: 'gulf_of_oman_lane',
    to: 'oman_approach_lane',
    path: coords([22.8, 60.2], [23.2, 59.8], [23.7, 59.3], [24.2, 58.8]),
  },
  {
    from: 'arabian_sea_lane',
    to: 'gulf_of_aden_lane',
    path: coords([16.5, 66.0], [14.6, 61.5], [13.8, 57.0], [12.9, 53.0], [13.2, 49.2]),
    risk: 0.16,
  },
  {
    from: 'gulf_of_aden_lane',
    to: 'red_sea_south_lane',
    path: coords([13.2, 49.2], [12.7, 46.2], [12.6, 43.6], [14.8, 41.5], [18.0, 40.0]),
    risk: 0.18,
  },
  {
    from: 'red_sea_south_lane',
    to: 'red_sea_north_lane',
    path: coords([18.0, 40.0], [20.0, 39.2], [22.2, 37.8], [24.5, 35.5]),
    risk: 0.18,
  },
  {
    from: 'red_sea_north_lane',
    to: 'suez_lane',
    path: coords([24.5, 35.5], [26.4, 34.8], [28.4, 33.9], [30.6, 32.3]),
    risk: 0.18,
  },
  {
    from: 'suez_lane',
    to: 'east_med_lane',
    path: coords([30.6, 32.3], [31.8, 32.6], [32.8, 31.5], [33.8, 28.0]),
    risk: 0.16,
  },
  {
    from: 'east_med_lane',
    to: 'central_med_lane',
    path: coords([33.8, 28.0], [34.8, 24.8], [35.4, 21.2], [35.8, 18.0]),
  },
  {
    from: 'central_med_lane',
    to: 'west_med_lane',
    path: coords([35.8, 18.0], [36.0, 14.4], [36.2, 10.2], [36.8, 6.0]),
  },
  {
    from: 'west_med_lane',
    to: 'gibraltar_lane',
    path: coords([36.8, 6.0], [36.6, 2.2], [36.4, -1.2], [36.1, -3.8], [35.95, -5.7]),
    risk: 0.16,
  },
  {
    from: 'gibraltar_lane',
    to: 'iberia_atlantic_lane',
    path: coords([35.95, -5.7], [35.9, -7.2], [36.4, -8.9], [38.2, -10.0], [41.0, -10.2]),
    risk: 0.14,
  },
  {
    from: 'iberia_atlantic_lane',
    to: 'bay_biscay_lane',
    path: coords([41.0, -10.2], [42.8, -9.6], [44.4, -8.6], [46.0, -7.2]),
  },
  {
    from: 'bay_biscay_lane',
    to: 'english_channel_lane',
    path: coords([46.0, -7.2], [47.8, -5.8], [49.2, -3.8], [50.2, -1.4]),
  },
  {
    from: 'english_channel_lane',
    to: 'north_sea_lane',
    path: coords([50.2, -1.4], [50.8, 0.0], [51.8, 1.8], [53.1, 3.1]),
  },
  { from: 'gibraltar_lane', to: 'west_africa_north_lane', path: pathFromIds('gibraltar_lane', 'west_africa_north_lane') },
  { from: 'west_africa_north_lane', to: 'west_africa_mid_lane', path: pathFromIds('west_africa_north_lane', 'west_africa_mid_lane') },
  { from: 'west_africa_mid_lane', to: 'west_africa_south_lane', path: pathFromIds('west_africa_mid_lane', 'west_africa_south_lane') },
  { from: 'west_africa_south_lane', to: 'namibia_lane', path: pathFromIds('west_africa_south_lane', 'namibia_lane') },
  { from: 'namibia_lane', to: 'cape_lane', path: pathFromIds('namibia_lane', 'cape_lane') },
  { from: 'cape_lane', to: 'mozambique_lane', path: pathFromIds('cape_lane', 'mozambique_lane') },
  { from: 'mozambique_lane', to: 'somali_basin_lane', path: pathFromIds('mozambique_lane', 'somali_basin_lane') },
  { from: 'somali_basin_lane', to: 'gulf_of_aden_lane', path: pathFromIds('somali_basin_lane', 'gulf_of_aden_lane') },
  { from: 'east_china_sea_lane', to: 'north_pacific_west_lane', path: pathFromIds('east_china_sea_lane', 'north_pacific_west_lane') },
  { from: 'north_pacific_west_lane', to: 'north_pacific_mid_lane', path: pathFromIds('north_pacific_west_lane', 'north_pacific_mid_lane') },
  { from: 'north_pacific_mid_lane', to: 'north_pacific_east_lane', path: pathFromIds('north_pacific_mid_lane', 'north_pacific_east_lane') },
  { from: 'north_pacific_east_lane', to: 'baja_lane', path: pathFromIds('north_pacific_east_lane', 'baja_lane') },
  { from: 'baja_lane', to: 'panama_pacific_lane', path: pathFromIds('baja_lane', 'panama_pacific_lane') },
  { from: 'panama_pacific_lane', to: 'panama_canal_lane', path: pathFromIds('panama_pacific_lane', 'panama_canal_lane'), risk: 0.16 },
  { from: 'panama_canal_lane', to: 'caribbean_lane', path: pathFromIds('panama_canal_lane', 'caribbean_lane'), risk: 0.16 },
  { from: 'caribbean_lane', to: 'north_atlantic_west_lane', path: pathFromIds('caribbean_lane', 'north_atlantic_west_lane') },
  { from: 'north_atlantic_west_lane', to: 'mid_atlantic_lane', path: pathFromIds('north_atlantic_west_lane', 'mid_atlantic_lane') },
  { from: 'mid_atlantic_lane', to: 'azores_lane', path: pathFromIds('mid_atlantic_lane', 'azores_lane') },
  { from: 'azores_lane', to: 'iberia_atlantic_lane', path: pathFromIds('azores_lane', 'iberia_atlantic_lane') },
];

const PORT_CONNECTIONS: Record<string, RouteDefinition[]> = {
  shanghai: [
    {
      from: 'shanghai',
      to: 'yellow_sea_lane',
      path: [
        { lat: 31.2304, lng: 121.4737 },
        { lat: 31.8, lng: 122.3 },
        { lat: 32.6, lng: 123.5 },
        { lat: 33.7, lng: 124.8 },
      ],
    },
  ],
  busan: [
    {
      from: 'busan',
      to: 'yellow_sea_lane',
      path: [
        { lat: 35.1796, lng: 129.0756 },
        { lat: 35.5, lng: 128.0 },
        { lat: 35.2, lng: 126.6 },
        { lat: 34.6, lng: 125.5 },
        { lat: 33.7, lng: 124.8 },
      ],
    },
  ],
  hongkong: [
    {
      from: 'hongkong',
      to: 'south_china_sea_north',
      path: [
        { lat: 22.3193, lng: 114.1694 },
        { lat: 21.8, lng: 115.4 },
        { lat: 20.6, lng: 116.0 },
        { lat: 18.4, lng: 114.2 },
      ],
    },
  ],
  singapore: [
    {
      from: 'singapore',
      to: 'singapore_strait_lane',
      path: [
        { lat: 1.2966, lng: 103.7764 },
        { lat: 1.2, lng: 104.0 },
        { lat: 1.3, lng: 104.3 },
      ],
      risk: 0.14,
    },
  ],
  colombo: [
    {
      from: 'colombo',
      to: 'sri_lanka_south_lane',
      path: [
        { lat: 6.9271, lng: 79.8612 },
        { lat: 6.4, lng: 80.3 },
        { lat: 6.0, lng: 81.0 },
        { lat: 5.6, lng: 81.5 },
      ],
    },
  ],
  mumbai: [
    {
      from: 'mumbai',
      to: 'arabian_sea_lane',
      path: [
        { lat: 18.9388, lng: 72.8354 },
        { lat: 18.6, lng: 71.8 },
        { lat: 18.0, lng: 70.2 },
        { lat: 17.2, lng: 68.2 },
        { lat: 16.5, lng: 66.0 },
      ],
    },
  ],
  dubai: [
    {
      from: 'dubai',
      to: 'oman_approach_lane',
      path: [
        { lat: 24.9857, lng: 55.0272 },
        { lat: 24.9, lng: 55.9 },
        { lat: 24.8, lng: 56.9 },
        { lat: 24.5, lng: 57.9 },
        { lat: 24.2, lng: 58.8 },
      ],
      risk: 0.16,
    },
  ],
  rotterdam: [
  {
    from: 'rotterdam',
    to: 'north_sea_lane',
      path: [
        { lat: 51.9225, lng: 4.4792 },
        { lat: 52.08, lng: 4.18 },
        { lat: 52.38, lng: 3.75 },
        { lat: 52.72, lng: 3.38 },
        { lat: 53.1, lng: 3.1 },
      ],
    },
  ],
  hamburg: [
    {
      from: 'hamburg',
      to: 'north_sea_lane',
      path: [
        { lat: 53.5753, lng: 9.9827 },
        { lat: 54.0, lng: 8.4 },
        { lat: 53.8, lng: 6.2 },
        { lat: 53.1, lng: 3.1 },
      ],
    },
  ],
  antwerp: [
    {
      from: 'antwerp',
      to: 'north_sea_lane',
      path: [
        { lat: 51.2213, lng: 4.4051 },
        { lat: 51.7, lng: 3.8 },
        { lat: 52.4, lng: 3.3 },
        { lat: 53.1, lng: 3.1 },
      ],
    },
  ],
  felixstowe: [
    {
      from: 'felixstowe',
      to: 'english_channel_lane',
      path: [
        { lat: 51.9659, lng: 1.3516 },
        { lat: 51.3, lng: 1.0 },
        { lat: 50.8, lng: 0.2 },
        { lat: 50.2, lng: -1.4 },
      ],
    },
  ],
  capetown: [
    {
      from: 'capetown',
      to: 'cape_lane',
      path: [
        { lat: -33.9249, lng: 18.4241 },
        { lat: -34.1, lng: 18.2 },
        { lat: -34.3, lng: 18.0 },
        { lat: -34.4, lng: 17.8 },
      ],
    },
  ],
  losangeles: [
    {
      from: 'losangeles',
      to: 'baja_lane',
      path: [
        { lat: 33.7283, lng: -118.2712 },
        { lat: 32.8, lng: -118.3 },
        { lat: 30.8, lng: -118.2 },
        { lat: 27.0, lng: -118.0 },
      ],
    },
  ],
  newyork: [
    {
      from: 'newyork',
      to: 'north_atlantic_west_lane',
      path: [
        { lat: 40.6501, lng: -74.0377 },
        { lat: 39.8, lng: -73.0 },
        { lat: 37.8, lng: -71.2 },
        { lat: 34.5, lng: -69.3 },
        { lat: 31.0, lng: -68.0 },
      ],
    },
  ],
};

function getNode(nodeId: string, ports: Node[]): Node | undefined {
  return ports.find((node) => node.id === nodeId) ?? waypointMap.get(nodeId);
}

function calculateRisk(path: Coordinate[], defaultRisk = 0.08): number {
  const first = path[0];
  const last = path[path.length - 1];
  const key = `${first.lat}:${first.lng}|${last.lat}:${last.lng}`;
  const normalizedRisk = defaultRisk * 0.25;

  if (key.includes('99.8') || key.includes('32.3') || key.includes('-5.7') || key.includes('-79.6')) {
    return Math.max(normalizedRisk, 0.045);
  }

  return Math.max(0.015, normalizedRisk);
}

function makeSeaEdge(from: Node, to: Node, path: Coordinate[], risk = 0.08): Edge {
  let distance = 0;

  for (let index = 0; index < path.length - 1; index += 1) {
    distance += haversineDistance(path[index], path[index + 1]);
  }

  return {
    from: from.id,
    to: to.id,
    distance,
    baseTime: distance / SEA_SPEED_KMH,
    currentDelay: 0,
    disruptionRisk: calculateRisk(path, risk),
    cost: distance * 0.12,
    mode: 'sea',
    path,
  };
}

function addDefinition(graph: Graph, ports: Node[], definition: RouteDefinition): void {
  const fromNode = getNode(definition.from, ports);
  const toNode = getNode(definition.to, ports);
  if (!fromNode || !toNode) return;
  const crossesLand = pathCrossesLand(definition.path);
  const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
  if (crossesLand && isDev) {
    console.warn(`Sea path approximation overlaps coarse land polygon: ${definition.from} -> ${definition.to}`);
  }
  graph.addEdge(makeSeaEdge(fromNode, toNode, definition.path, definition.risk));
}

export function buildSeaOnlyGraph(ports: Node[]): Graph {
  const graph = new Graph();

  [...ports, ...MARITIME_WAYPOINTS].forEach((node) => graph.addNode(node));

  MARITIME_BACKBONE.forEach((definition) => addDefinition(graph, ports, definition));

  ports.forEach((port) => {
    const definitions = PORT_CONNECTIONS[port.id] ?? [];
    definitions.forEach((definition) => addDefinition(graph, ports, definition));
  });

  return graph;
}
