/**
 * Client-safe math utilities.
 *
 * IMPORTANT: All solver/optimization logic lives in python/solver.py (FastAPI).
 * This file contains ONLY the Haversine distance function used for client-side
 * map rendering (drawing lines from factory → target city on the SVG map).
 */

/**
 * Great-circle distance in km between two WGS-84 coordinates.
 * Pure TypeScript — safe to call in browser and server contexts.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
