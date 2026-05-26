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
  { id: 'FAC_A', name: 'Holland, MI',     lat:  42.7875, lng:  -86.1089, specialty: 'Wood & Assembly',    capacity: 85 },
  { id: 'FAC_B', name: 'Bruce, MS',       lat:  33.9937, lng:  -89.3495, specialty: 'Steel & Seating',    capacity: 90 },
  { id: 'FAC_C', name: 'Shanghai, CN',    lat:  31.2304, lng:  121.4737, specialty: 'Component Forging',  capacity: 40 },
  { id: 'FAC_D', name: 'Monterrey, MX',   lat:  25.6866, lng: -100.3161, specialty: 'Metal Fabrication',  capacity: 78 },
  { id: 'FAC_E', name: 'Warsaw, PL',      lat:  52.2297, lng:   21.0122, specialty: 'Precision Assembly', capacity: 82 },
];

// ---------------------------------------------------------------------------
// Structural BOM Matrix — Haworth-inspired synthetic catalog
// 88 SKUs across 8 product families · 5 manufacturing nodes
// ---------------------------------------------------------------------------
export const catalogItems: CatalogItem[] = [

  // ── COMPOSE PANEL FRAMES (14) ───────────────────────────────────────────
  { sku: 'COMP-PF-ST-A',  name: 'Panel Frame · Steel Standard',       origin: 'FAC_B', cost: 120, carbonScore: 45 },
  { sku: 'COMP-PF-ST-B',  name: 'Panel Frame · Steel Heavy-Gauge',    origin: 'FAC_B', cost: 145, carbonScore: 55 },
  { sku: 'COMP-PF-ST-C',  name: 'Panel Frame · Steel (MX)',           origin: 'FAC_D', cost: 105, carbonScore: 38 },
  { sku: 'COMP-PF-ST-D',  name: 'Panel Frame · Steel PC (MX)',        origin: 'FAC_D', cost: 115, carbonScore: 40 },
  { sku: 'COMP-PF-ST-E',  name: 'Panel Frame · Steel (CN)',           origin: 'FAC_C', cost:  92, carbonScore: 52 },
  { sku: 'COMP-PF-WD-A',  name: 'Panel Frame · Wood Veneer',          origin: 'FAC_A', cost: 150, carbonScore: 12 },
  { sku: 'COMP-PF-WD-B',  name: 'Panel Frame · Recycled Hardwood',   origin: 'FAC_A', cost: 138, carbonScore:  8 },
  { sku: 'COMP-PF-WD-C',  name: 'Panel Frame · Bamboo Composite',    origin: 'FAC_A', cost: 162, carbonScore:  6 },
  { sku: 'COMP-PF-GL-A',  name: 'Panel Frame · Glass Accent (EU)',    origin: 'FAC_E', cost: 175, carbonScore: 22 },
  { sku: 'COMP-PF-PM-A',  name: 'Panel Frame · Perforated Steel',     origin: 'FAC_B', cost: 132, carbonScore: 42 },
  { sku: 'COMP-PF-PM-B',  name: 'Panel Frame · Perforated (MX)',      origin: 'FAC_D', cost: 118, carbonScore: 35 },
  { sku: 'COMP-PF-AL-A',  name: 'Panel Frame · Aluminum (CN)',        origin: 'FAC_C', cost: 110, carbonScore: 36 },
  { sku: 'COMP-PF-AL-B',  name: 'Panel Frame · Aluminum (EU)',        origin: 'FAC_E', cost: 128, carbonScore: 28 },
  { sku: 'COMP-PF-HG-A',  name: 'Panel Frame · Steel HG (MX)',        origin: 'FAC_D', cost: 128, carbonScore: 48 },

  // ── PANEL TILES & INSERTS (12) ──────────────────────────────────────────
  { sku: 'COMP-TL-FB-A',  name: 'Panel Tile · Fabric Grade A',        origin: 'FAC_A', cost:  55, carbonScore:  9 },
  { sku: 'COMP-TL-FB-B',  name: 'Panel Tile · Fabric Grade A (EU)',   origin: 'FAC_E', cost:  62, carbonScore:  7 },
  { sku: 'COMP-TL-FB-C',  name: 'Panel Tile · Hi-Perf Fabric',        origin: 'FAC_A', cost:  72, carbonScore: 11 },
  { sku: 'COMP-TL-TB-A',  name: 'Panel Tile · Tackboard',             origin: 'FAC_A', cost:  38, carbonScore: 15 },
  { sku: 'COMP-TL-TB-B',  name: 'Panel Tile · Tackboard (MX)',        origin: 'FAC_D', cost:  34, carbonScore: 18 },
  { sku: 'COMP-TL-WB-A',  name: 'Panel Tile · Whiteboard (EU)',       origin: 'FAC_E', cost:  88, carbonScore: 20 },
  { sku: 'COMP-TL-WB-B',  name: 'Panel Tile · Whiteboard (CN)',       origin: 'FAC_C', cost:  74, carbonScore: 28 },
  { sku: 'COMP-TL-GL-A',  name: 'Panel Tile · Glass Insert (EU)',     origin: 'FAC_E', cost:  95, carbonScore: 18 },
  { sku: 'COMP-TL-GL-B',  name: 'Panel Tile · Glass Insert (CN)',     origin: 'FAC_C', cost:  80, carbonScore: 32 },
  { sku: 'COMP-TL-AC-A',  name: 'Panel Tile · Acoustic Backer',       origin: 'FAC_A', cost:  48, carbonScore:  6 },
  { sku: 'COMP-TL-AC-B',  name: 'Panel Tile · Acoustic Backer (EU)',  origin: 'FAC_E', cost:  55, carbonScore:  5 },
  { sku: 'COMP-TL-MB-A',  name: 'Panel Tile · Markerboard (MX)',      origin: 'FAC_D', cost:  42, carbonScore: 22 },

  // ── WORKSURFACES (12) ───────────────────────────────────────────────────
  { sku: 'SURF-LN-A',     name: 'Worksurface · Laminate Standard',    origin: 'FAC_A', cost:  80, carbonScore: 18 },
  { sku: 'SURF-LN-B',     name: 'Worksurface · Laminate (CN)',        origin: 'FAC_C', cost:  68, carbonScore: 25 },
  { sku: 'SURF-LN-C',     name: 'Worksurface · Laminate Premium',     origin: 'FAC_A', cost:  95, carbonScore: 16 },
  { sku: 'SURF-LN-D',     name: 'Worksurface · Laminate Premium (EU)',origin: 'FAC_E', cost: 108, carbonScore: 12 },
  { sku: 'SURF-WD-A',     name: 'Worksurface · Wood Veneer',          origin: 'FAC_A', cost: 140, carbonScore: 14 },
  { sku: 'SURF-SS-A',     name: 'Worksurface · Solid Surface (EU)',   origin: 'FAC_E', cost: 165, carbonScore: 20 },
  { sku: 'SURF-SS-B',     name: 'Worksurface · Solid Surface (CN)',   origin: 'FAC_C', cost: 142, carbonScore: 30 },
  { sku: 'SURF-FX-A',     name: 'Worksurface · Fenix Matte (EU)',     origin: 'FAC_E', cost: 188, carbonScore: 16 },
  { sku: 'SURF-HL-A',     name: 'Worksurface · High-Gloss (EU)',      origin: 'FAC_E', cost: 175, carbonScore: 22 },
  { sku: 'SURF-HL-B',     name: 'Worksurface · High-Gloss (CN)',      origin: 'FAC_C', cost: 148, carbonScore: 35 },
  { sku: 'SURF-SH-A',     name: 'Worksurface · Standing Height Lam',  origin: 'FAC_A', cost:  98, carbonScore: 20 },
  { sku: 'SURF-CRN-A',    name: 'Worksurface · Corner Return Lam',    origin: 'FAC_A', cost: 115, carbonScore: 22 },

  // ── TASK SEATING (12) ───────────────────────────────────────────────────
  { sku: 'SEAT-FN-A',     name: 'Fern Chair · Standard',              origin: 'FAC_B', cost: 380, carbonScore: 58 },
  { sku: 'SEAT-FN-B',     name: 'Fern Chair · Standard (MX)',         origin: 'FAC_D', cost: 348, carbonScore: 52 },
  { sku: 'SEAT-FN-C',     name: 'Fern Chair · Premium',               origin: 'FAC_B', cost: 445, carbonScore: 62 },
  { sku: 'SEAT-ZD-A',     name: 'Zody II · Standard',                 origin: 'FAC_B', cost: 285, carbonScore: 48 },
  { sku: 'SEAT-ZD-B',     name: 'Zody II · Standard (MX)',            origin: 'FAC_D', cost: 262, carbonScore: 44 },
  { sku: 'SEAT-ZD-C',     name: 'Zody II · Standard (CN)',            origin: 'FAC_C', cost: 238, carbonScore: 58 },
  { sku: 'SEAT-ZD-D',     name: 'Zody II · High-Back',                origin: 'FAC_B', cost: 318, carbonScore: 52 },
  { sku: 'SEAT-VY-A',     name: 'Very Chair · Side',                  origin: 'FAC_B', cost: 195, carbonScore: 40 },
  { sku: 'SEAT-VY-B',     name: 'Very Chair · Side (MX)',             origin: 'FAC_D', cost: 178, carbonScore: 36 },
  { sku: 'SEAT-VY-C',     name: 'Very Chair · Sled Base',             origin: 'FAC_B', cost: 212, carbonScore: 42 },
  { sku: 'SEAT-CS-A',     name: 'Compose Stool · Standard',           origin: 'FAC_A', cost: 225, carbonScore: 28 },
  { sku: 'SEAT-CS-B',     name: 'Compose Stool (MX)',                 origin: 'FAC_D', cost: 208, carbonScore: 32 },

  // ── LOUNGE & MEETING SEATING (8) ────────────────────────────────────────
  { sku: 'SEAT-CB-A',     name: 'Cabana Lounge · Single Seat',        origin: 'FAC_B', cost: 520, carbonScore: 65 },
  { sku: 'SEAT-CB-B',     name: 'Cabana Lounge · Single (MX)',        origin: 'FAC_D', cost: 488, carbonScore: 58 },
  { sku: 'SEAT-CB-C',     name: 'Cabana Lounge · Settee',             origin: 'FAC_B', cost: 780, carbonScore: 72 },
  { sku: 'SEAT-IP-A',     name: 'Interpole Ottoman · Standard',       origin: 'FAC_A', cost: 185, carbonScore: 22 },
  { sku: 'SEAT-IP-B',     name: 'Interpole Ottoman (MX)',             origin: 'FAC_D', cost: 168, carbonScore: 28 },
  { sku: 'SEAT-CB-ST',    name: 'Cabana Side Table',                  origin: 'FAC_A', cost: 145, carbonScore: 18 },
  { sku: 'SEAT-BR-A',     name: 'Brabo Lounge Chair',                 origin: 'FAC_B', cost: 310, carbonScore: 45 },
  { sku: 'SEAT-BR-B',     name: 'Brabo Lounge Chair (MX)',            origin: 'FAC_D', cost: 285, carbonScore: 40 },

  // ── STORAGE (12) ────────────────────────────────────────────────────────
  { sku: 'STOR-MP-A',     name: 'Mobile Pedestal · 2-Drawer',         origin: 'FAC_B', cost: 275, carbonScore: 48 },
  { sku: 'STOR-MP-B',     name: 'Mobile Pedestal · 2-Drawer (MX)',   origin: 'FAC_D', cost: 252, carbonScore: 42 },
  { sku: 'STOR-MP-C',     name: 'Mobile Pedestal · 2-Drawer (CN)',   origin: 'FAC_C', cost: 228, carbonScore: 55 },
  { sku: 'STOR-MP-D',     name: 'Mobile Pedestal · 3-Drawer',         origin: 'FAC_B', cost: 312, carbonScore: 52 },
  { sku: 'STOR-MP-E',     name: 'Mobile Pedestal · 3-Drawer (MX)',   origin: 'FAC_D', cost: 285, carbonScore: 46 },
  { sku: 'STOR-OB-A',     name: 'Overhead Storage Bin',               origin: 'FAC_A', cost: 165, carbonScore: 25 },
  { sku: 'STOR-OB-B',     name: 'Overhead Storage Bin (EU)',          origin: 'FAC_E', cost: 178, carbonScore: 20 },
  { sku: 'STOR-LF-A',     name: 'Lateral File · 2-Drawer',            origin: 'FAC_B', cost: 345, carbonScore: 58 },
  { sku: 'STOR-LF-B',     name: 'Lateral File · 2-Drawer (MX)',       origin: 'FAC_D', cost: 318, carbonScore: 50 },
  { sku: 'STOR-WD-A',     name: 'Wardrobe Unit · Standard',           origin: 'FAC_A', cost: 245, carbonScore: 28 },
  { sku: 'STOR-WD-B',     name: 'Wardrobe Unit (EU)',                 origin: 'FAC_E', cost: 268, carbonScore: 22 },
  { sku: 'STOR-TW-A',     name: 'Tower File Cabinet',                 origin: 'FAC_B', cost: 395, carbonScore: 62 },

  // ── POWER & CABLING (8) ─────────────────────────────────────────────────
  { sku: 'PWR-IM-A',      name: 'Integrated Power Module',            origin: 'FAC_A', cost:  85, carbonScore: 12 },
  { sku: 'PWR-IM-B',      name: 'Integrated Power Module (EU)',       origin: 'FAC_E', cost:  92, carbonScore: 10 },
  { sku: 'PWR-US-A',      name: 'Dual-USB Power Strip (CN)',          origin: 'FAC_C', cost:  48, carbonScore: 28 },
  { sku: 'PWR-US-B',      name: 'Dual-USB Power Strip (MX)',          origin: 'FAC_D', cost:  55, carbonScore: 22 },
  { sku: 'PWR-CM-A',      name: 'Cable Management Tray',              origin: 'FAC_A', cost:  38, carbonScore:  8 },
  { sku: 'PWR-CM-B',      name: 'Cable Management Tray (MX)',         origin: 'FAC_D', cost:  34, carbonScore: 12 },
  { sku: 'PWR-MA-A',      name: 'Monitor Arm · Single (EU)',          origin: 'FAC_E', cost: 125, carbonScore: 18 },
  { sku: 'PWR-MA-B',      name: 'Monitor Arm · Single (CN)',          origin: 'FAC_C', cost: 108, carbonScore: 28 },

  // ── TEXTILES & ACOUSTICS (10) ───────────────────────────────────────────
  { sku: 'TXTL-DK-A',     name: 'Digital Knit Textile · Standard',    origin: 'FAC_A', cost:  65, carbonScore:  5 },
  { sku: 'TXTL-DK-B',     name: 'Digital Knit Textile · Premium',     origin: 'FAC_A', cost:  72, carbonScore:  6 },
  { sku: 'TXTL-WV-A',     name: 'Hi-Performance Woven Fabric',        origin: 'FAC_A', cost:  58, carbonScore:  8 },
  { sku: 'TXTL-WV-B',     name: 'Hi-Performance Woven Fabric (EU)',   origin: 'FAC_E', cost:  64, carbonScore:  6 },
  { sku: 'TXTL-EC-A',     name: 'Eco-Certified Fabric · Recycled',    origin: 'FAC_A', cost:  54, carbonScore:  4 },
  { sku: 'TXTL-EC-B',     name: 'Eco-Certified Fabric (EU)',          origin: 'FAC_E', cost:  60, carbonScore:  3 },
  { sku: 'TXTL-AF-A',     name: 'Acoustic Foam Backer Panel',         origin: 'FAC_A', cost:  42, carbonScore:  7 },
  { sku: 'TXTL-VL-A',     name: 'Velour Tile Fabric',                 origin: 'FAC_A', cost:  48, carbonScore:  9 },
  { sku: 'TXTL-VL-B',     name: 'Velour Tile Fabric (EU)',            origin: 'FAC_E', cost:  52, carbonScore:  7 },
  { sku: 'TXTL-AM-A',     name: 'Antimicrobial Performance Fabric',   origin: 'FAC_E', cost:  68, carbonScore:  5 },
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

/** Fast factory lookup by id. */
export const factoryIndex: Record<string, Factory> = Object.fromEntries(
  factories.map((f) => [f.id, f])
);