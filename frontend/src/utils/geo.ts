import type { Coordinate, Node } from '../types';

/**
 * Calculate haversine distance between two coordinates (in km)
 */
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

/**
 * Convert distance (km) and average speed (km/h) to time (hours)
 */
export function distanceToTime(distanceKm: number, speedKmh = 35): number {
  return distanceKm / speedKmh;
}

/**
 * Get the geographic center of an array of coordinates
 */
export function getCenterCoordinate(coords: Coordinate[]): Coordinate {
  if (coords.length === 0) return { lat: 20, lng: 0 };
  const lat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
  const lng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;
  return { lat, lng };
}

/**
 * Calculate bounding box for an array of coordinates
 */
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

/**
 * Convert a node to a Coordinate
 */
export function nodeToCoord(node: Node): Coordinate {
  return { lat: node.latitude, lng: node.longitude };
}
