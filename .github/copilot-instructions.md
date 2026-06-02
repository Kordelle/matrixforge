# 🛠️ MatrixForge

> A Multi-Layered Hybrid AI Architecture for BOM-based B2B Supply Chain & Modular Product Optimization.

## 🌐 The Architecture Stack
- **Frontend:** Next.js (App Router) + React + Tailwind CSS + Shadcn/ui + Recharts
- **Orchestration Layer:** Live LLM Gateway utilizing Strict JSON Structured Outputs
- **Compute Engine:** Python FastAPI + NumPy-based BOM solver + ChromaDB semantic retrieval
- **Future Target Alignment:** Compliant with `NVIDIA CUDA-Q` emulated topologies & QPU hardware APIs

## 📈 Abstract Business Scenario
Industrial contract manufacturing and modular spatial layout configurations naturally trigger **combinatorial explosions**. When compounding millions of BOM permutations, space-program mixes, regional factory capacities, freight routing costs, and carbon metrics, sequential databases hit a hard computational wall.

**MatrixForge** demonstrates a hybrid solution: utilizing an intuitive natural language frontend to capture enterprise business parameters, transforming that data into a space-program plus BOM matrix, and resolving the global optimum in parallel.

## 1. Project Vision & Context
- Target Organization: Internal enterprise manufacturing stakeholders.
- Business Model: Multi-variable B2B manufacturing, modular spatial layouts, global logistics, and full Bill of Materials (BOM) generation.
- The Core Problem: Combinatorial explosion when trying to simultaneously optimize space-program mixes, custom materials, shipping costs, factory lead times, and carbon footprint metrics.
- The MatrixForge Goal: Build a working prototype that acts as a friendly "Automated Design & Quote Assistant" for sales reps. It uses a live Large Language Model to parse the request into structured space-program inputs, then runs a deterministic BOM solver and per-category semantic search pipeline. Keep the architecture ready for CUDA-Q/QPU experimentation, but do not let that future target distort the current implementation.

## 2. Technical Stack & Execution Constraints
- Frontend: Next.js (App Router), React, Tailwind CSS, Lucide React, and Shadcn/ui for clean executive-level components. Charts render with Recharts.
- Backend & Orchestration: Next.js API Routes (Node.js/TypeScript) are the orchestration layer, paired with a dedicated Python FastAPI compute service for BOM resolution and catalog search. Use the official OpenAI SDK.
- AI Gateway (Live LLM): OpenAI API (gpt-4o-mini or gpt-4o) with strict Structured Outputs. The LLM must return structured JSON for target location, floors, sq ft per floor, space mix, and weights.
- Data Strategy: 100% local, synthetic (mock) data. Do not introduce proprietary internal data.
- Compute Simulation: Use local numerical methods to simulate instant optimization, then keep the codepath compatible with vectorized or parallel solver expansion.

## 3. Synthetic Data Schema (Canonical Seed Data Loaded In-Memory)
Maintain canonical synthetic seed datasets in source modules and load them in-memory at runtime to ensure consistency across demos, tests, and optimization runs:

```typescript
// Nodes Matrix
const factories = [
  { id: 'FAC_A', name: 'Holland, MI', lat: 42.7875, lng: -86.1089, specialty: 'Wood & Assembly', capacity: 85 },
  { id: 'FAC_B', name: 'Bruce, MS', lat: 33.9937, lng: -89.3495, specialty: 'Steel & Seating', capacity: 90 },
  { id: 'FAC_C', name: 'Shanghai, CN', lat: 31.2304, lng: 121.4737, specialty: 'Component Forging', capacity: 40 },
  { id: 'FAC_D', name: 'Monterrey, MX', lat: 25.6866, lng: -100.3161, specialty: 'Storage & Packaging', capacity: 72 },
  { id: 'FAC_E', name: 'Warsaw, PL', lat: 52.2297, lng: 21.0122, specialty: 'Power & Electrical', capacity: 68 }
];

// Structural BOM Matrix
const catalogItems = [
  { sku: 'COMP-FRAME-ST', name: 'Compose Panel Frame (Steel)', origin: 'FAC_B', cost: 120, carbonScore: 45 },
  { sku: 'COMP-FRAME-WD', name: 'Compose Panel Frame (Wood)', origin: 'FAC_A', cost: 150, carbonScore: 12 },
  { sku: 'COMP-SURF-LN', name: 'Laminate Worksurface', origin: 'FAC_A', cost: 80, carbonScore: 18 },
  { sku: 'COMP-TEXT-DK', name: 'Digital Knit Textile', origin: 'FAC_A', cost: 65, carbonScore: 5 },
  { sku: 'COMP-CHAIR-TK', name: 'Task Chair Kit', origin: 'FAC_B', cost: 95, carbonScore: 22 },
  { sku: 'COMP-POWER-MD', name: 'Power Module', origin: 'FAC_E', cost: 110, carbonScore: 30 }
];

// Target Cities Directory (For Haversine Distance Calculations)
const clientCities = [
  { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
  { name: 'New York, NY', lat: 40.7128, lng: -74.0060 },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Toronto, Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Mexico City, Mexico', lat: 19.4326, lng: -99.1332 }
];
```

## 4. Feature Implementation Requirements
Feature 1: The Live LLM Parsing Interface
Create a clean Next.js textarea where a user input simulates a conversational B2B sales request.
Example Target Input: "Outfit a 3-floor office campus in Chicago using Compose workstations. Prioritize low carbon footprint and mid-range costs."
Implementation: Build a secure backend API route that passes this raw text directly to OpenAI (gpt-4o-mini). Use system prompts and strict JSON schemas to force the LLM to output exactly this structured template:

```json
{
  "targetLocation": "Chicago, IL",
  "floors": 3,
  "sqFtPerFloor": 10000,
  "spaceMix": {
    "openOfficePct": 0.65,
    "enclosedOfficePct": 0.10,
    "conferencePct": 0.15,
    "loungePct": 0.10
  },
  "weights": {
    "carbonWeight": 0.70,
    "costWeight": 0.20,
    "speedWeight": 0.10
  }
}
```

## 5. Feature Implementation Requirements
Feature 2: The Multi-Variable Optimization Sandbox
Build an internal mathematical execution function that directly receives the JSON output from the live LLM.
The solver must expand the space program into a BOM, then score and balance freight distance, manufacturing latency, and carbon/cost/speed weights.
Implement a toggle switch on the UI: [ Traditional Sequential Sort ] vs. [ Matrix Parallel Optimization ].
Traditional: Runs a rigorous sequential baseline solver that prioritizes correctness and full traceability over speed.
Matrix Parallel: Executes a vectorized path designed to preserve quality while scaling to larger catalogs.
Keep the project result structure BOM-first: multiple category lines, per-line factory routing, and aggregate totals.

Feature 3: Executive Business Dashboard (The "Wow" Factor)
The Interactive Map: Implement an interactive map (using react-map-gl, Leaflet, or responsive SVG coordinates) showing dynamic, colored lines lighting up from every active factory to the parsed delivery destination.
High-Impact KPI Cards: Render large, high-contrast metric displays showcasing:
- Total Project Cost ($): Dynamically recalculated based on the weight sliders.
- Carbon Footprint Reduction (%): Show vs. baseline carbon, not an abstract score.
- Delivery Lead Time Window (Days): Driven by simulated factory backlog and BOM routing.
- Supply Node Count: Show how many factories are active in the winning BOM.

Add a BOM table beneath the KPI cards when results are available. The table should present category, SKU, source factory, quantity, unit cost, total cost, and CO2e.

## 6. Coding Instructions & Prompt Syntax
"Copilot: Keep MatrixForge BOM-first. Generate clean, modular, typesafe components that reflect the current architecture: Next.js App Router frontend, Python FastAPI compute service, live OpenAI JSON parsing, ChromaDB semantic lookup, BOM assembly, and ProjectResult aggregation. Prioritize visual aesthetics for executives, highly scannable grid layouts, compact structural text, and interactive sliders that alter the optimization math instantly without forcing page reloads."