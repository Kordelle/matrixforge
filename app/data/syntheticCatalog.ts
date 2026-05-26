/**
 * Canonical synthetic seed data — loaded in-memory at runtime.
 *
 * Mirrors python/data.py exactly. Both files must stay in sync.
 * Zero proprietary internal data — 100% synthetic for development and demos.
 */

export interface Factory {
  id: string;
  name: string;
  lat: number;
  lng: number;
  specialty: string;
  capacity: number; // 0-100 current utilization percentage
}

export interface CatalogItem {
  sku: string;
  name: string;
  origin: string; // factory id
  cost: number; // USD per unit
  carbonScore: number; // 0-100, lower is greener
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
  { id: 'FAC_A', name: 'Holland, MI',  lat: 42.7875, lng: -86.1089, specialty: 'Wood & Assembly',    capacity: 85 },
  { id: 'FAC_B', name: 'Bruce, MS',    lat: 33.9937, lng: -89.3495, specialty: 'Steel & Seating',    capacity: 90 },
  { id: 'FAC_C', name: 'Shanghai, CN', lat: 31.2304, lng: 121.4737, specialty: 'Component Forging',  capacity: 40 },
];

// ---------------------------------------------------------------------------
// Structural BOM Matrix
// ---------------------------------------------------------------------------
export const catalogItems: CatalogItem[] = [
  { sku: 'COMP-FRAME-ST', name: 'Compose Panel Frame (Steel)', origin: 'FAC_B', cost: 120, carbonScore: 45 },
  { sku: 'COMP-FRAME-WD', name: 'Compose Panel Frame (Wood)',  origin: 'FAC_A', cost: 150, carbonScore: 12 },
  { sku: 'COMP-SURF-LN',  name: 'Laminate Worksurface',        origin: 'FAC_A', cost: 80,  carbonScore: 18 },
  { sku: 'COMP-TEXT-DK',  name: 'Digital Knit Textile',        origin: 'FAC_A', cost: 65,  carbonScore:  5 },
];

// ---------------------------------------------------------------------------
// Target Cities Directory (for Haversine routing)
// ---------------------------------------------------------------------------
export const clientCities: ClientCity[] = [
  { name: 'Chicago, IL',  lat: 41.8781, lng: -87.6298 },
  { name: 'New York, NY', lat: 40.7128, lng: -74.0060 },
  { name: 'London, UK',   lat: 51.5074, lng:  -0.1278 },
];

/** Fast factory lookup by id. */
export const factoryIndex: Record<string, Factory> = Object.fromEntries(
  factories.map((f) => [f.id, f])
);