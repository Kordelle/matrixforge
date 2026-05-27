/**
 * Canonical synthetic seed data — factories and cities used by the frontend.
 *
 * The full SKU catalog (24,904 items) now lives in python/data/catalog_seed.ndjson
 * and is indexed into ChromaDB at container startup. The TypeScript layer no
 * longer needs a static catalogItems array — the optimizer receives SKU data
 * from the Python compute engine after semantic pre-filtering.
 */

export interface Factory {
  id: string;
  name: string;
  lat: number;
  lng: number;
  specialty: string;
  capacity: number; // 0-100 current utilization percentage
}

export interface ClientCity {
  name: string;
  lat: number;
  lng: number;
}

// ---------------------------------------------------------------------------
// Nodes Matrix
// ---------------------------------------------------------------------------
export const factories: Factory[] = [
  { id: 'FAC_A', name: 'Holland, MI',    lat:  42.7875, lng:  -86.1089, specialty: 'Wood & Assembly',    capacity: 85 },
  { id: 'FAC_B', name: 'Bruce, MS',      lat:  33.9937, lng:  -89.3495, specialty: 'Steel & Seating',    capacity: 90 },
  { id: 'FAC_C', name: 'Shanghai, CN',   lat:  31.2304, lng:  121.4737, specialty: 'Component Forging',  capacity: 40 },
  { id: 'FAC_D', name: 'Monterrey, MX',  lat:  25.6866, lng: -100.3161, specialty: 'Metal Fabrication',  capacity: 78 },
  { id: 'FAC_E', name: 'Warsaw, PL',     lat:  52.2297, lng:   21.0122, specialty: 'Precision Assembly', capacity: 82 },
];

// ---------------------------------------------------------------------------
// Target Cities Directory (for Haversine routing)
// ---------------------------------------------------------------------------
export const clientCities: ClientCity[] = [
  { name: 'Chicago, IL',         lat:  41.8781, lng:  -87.6298 },
  { name: 'New York, NY',        lat:  40.7128, lng:  -74.0060 },
  { name: 'Los Angeles, CA',     lat:  34.0522, lng: -118.2437 },
  { name: 'Toronto, Canada',     lat:  43.6510, lng:  -79.3470 },
  { name: 'Mexico City, Mexico', lat:  19.4326, lng:  -99.1332 },
  { name: 'São Paulo, Brazil',   lat: -23.5505, lng:  -46.6333 },
  { name: 'London, UK',          lat:  51.5074, lng:   -0.1278 },
  { name: 'Frankfurt, Germany',  lat:  50.1109, lng:    8.6821 },
  { name: 'Cairo, Egypt',        lat:  30.0444, lng:   31.2357 },
  { name: 'Dubai, UAE',          lat:  25.2048, lng:   55.2708 },
  { name: 'Mumbai, India',       lat:  19.0760, lng:   72.8777 },
  { name: 'Singapore',           lat:   1.3521, lng:  103.8198 },
  { name: 'Tokyo, Japan',        lat:  35.6762, lng:  139.6503 },
  { name: 'Seoul, South Korea',  lat:  37.5665, lng:  126.9780 },
  { name: 'Sydney, Australia',   lat: -33.8688, lng:  151.2093 },
];
