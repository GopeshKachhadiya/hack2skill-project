import type { Coordinate, Node } from '../types';


export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}


export function distanceToTime(distanceKm: number, speedKmh = 35): number {
  return distanceKm / speedKmh;
}


export function getCenterCoordinate(coords: Coordinate[]): Coordinate {
  if (coords.length === 0) return { lat: 20, lng: 0 };
  const lat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
  const lng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;
  return { lat, lng };
}


export function getBoundingBox(coords: Coordinate[]): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lng);
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}


export function nodeToCoord(node: Node): Coordinate {
  return { lat: node.latitude, lng: node.longitude };
}


export function generateCurvedPath(points: [number, number][], curveFactor = 0.2): [number, number][] {
  if (points.length < 2) return points;

  const result: [number, number][] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];

    if (i === 0) result.push(start);

    const [lat1, lng1] = start;
    const [lat2, endLng] = end;
    let lng2 = endLng;

    const lngDiff = lng2 - lng1;
    if (lngDiff > 180) {
      lng2 -= 360;
    } else if (lngDiff < -180) {
      lng2 += 360;
    }

    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    const perpLat = -dLng;
    const perpLng = dLat;
    const ctrlLat = midLat + perpLat * curveFactor;
    const ctrlLng = midLng + perpLng * curveFactor;

    const numPoints = 20;
    for (let j = 1; j <= numPoints; j++) {
      const t = j / numPoints;
      const t1 = 1 - t;
      const bLat = t1 * t1 * lat1 + 2 * t1 * t * ctrlLat + t * t * lat2;
      let bLng = t1 * t1 * lng1 + 2 * t1 * t * ctrlLng + t * t * lng2;

      while (bLng > 180) bLng -= 360;
      while (bLng < -180) bLng += 360;

      result.push([bLat, bLng]);
    }
  }

  return result;
}