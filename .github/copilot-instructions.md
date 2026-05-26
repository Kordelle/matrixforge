# 🛠️ MatrixForge

> A Multi-Layered Hybrid AI Architecture for Combinatorial B2B Supply Chain & Modular Product Optimization.

## 🌐 The Architecture Stack
- **Frontend:** Next.js (App Router) + React + Tailwind CSS + Shadcn/ui + Recharts
- **Orchestration Layer:** Live LLM Gateway utilizing Strict JSON Structured Outputs
- **Compute Engine:** High-Dimensional Matrix Vectorization & Parallel Linear Optimization
- **Future Target Alignment:** Compliant with `NVIDIA CUDA-Q` emulated topologies & QPU hardware APIs

## 📈 Abstract Business Scenario
Industrial contract manufacturing and modular spatial layout configurations naturally trigger **combinatorial explosions**. When compounding millions of custom component permutations (BOMs), shifting regional factory capacities, freight routing costs, and strict environmental carbon metrics, sequential databases hit a hard computational wall. 

**MatrixForge** demonstrates a hybrid solution: utilizing an intuitive natural language frontend to capture enterprise business parameters, transforming that data into a high-dimensional vector matrix, and resolving the global optimum in parallel.

## 1. Project Vision & Context
- Target Organization: Internal enterprise manufacturing stakeholders.
- Business Model: Multi-variable B2B manufacturing, modular spatial layouts (Compose workstation lines), global logistics, and custom Bill of Materials (BOM).
- The Core Problem: Combinatorial explosion when trying to simultaneously optimize layout geometry, custom materials (steel vs. wood, digital knits), shipping costs, factory lead times, and carbon footprint metrics.
- The MatrixForge Goal: Build a working prototype that acts as a friendly "Automated Design & Quote Assistant" for sales reps. It uses an end-to-end, live Large Language Model to process natural language inputs on the surface, but structures the data pipeline into a high-dimensional vector/matrix format. This ensures it is 100% ready to plug into a Quantum Processing Unit (QPU) or an emulated quantum circuit (CUDA-Q) later without requiring corporate re-architecture or terrifying the executives.

## 2. Technical Stack & Execution Constraints
- Frontend: Next.js (App Router), React, Tailwind CSS, Lucide React (Icons), and Shadcn/ui for clean executive-level components. Charts rendered via Recharts or Tremor.
- Backend & Orchestration: Next.js API Routes (Node.js/TypeScript) as the primary orchestration layer, paired with a dedicated Python (FastAPI) compute service for high-throughput optimization and very large matrix workloads. Must integrate the official OpenAI SDK.
- AI Gateway (Live LLM): OpenAI API (gpt-4o-mini or gpt-4o) leveraging strict Structured Outputs (`response_format: { type: "json_object" }` or Zod Schema schemas) to guarantee zero parsing errors.
- Data Strategy: 100% local, synthetic (mock) data. Strictly zero proprietary internal data to ensure security compliance during development and demos.
- Compute Simulation: Local execution using high-performance mathematical arrays (e.g., NumPy, SciPy.optimize, or custom TypeScript matrix solvers) to simulate instant, parallelized global optimization resolutions.

## 3. Synthetic Data Schema (Canonical Seed Data Loaded In-Memory)
Maintain canonical synthetic seed datasets in source modules and load them in-memory at runtime to ensure consistency across demos, tests, and optimization runs:

```typescript
// Nodes Matrix
const factories = [
  { id: 'FAC_A', name: 'Holland, MI', lat: 42.7875, lng: -86.1089, specialty: 'Wood & Assembly', capacity: 85 },
  { id: 'FAC_B', name: 'Bruce, MS', lat: 33.9937, lng: -89.3495, specialty: 'Steel & Seating', capacity: 90 },
  { id: 'FAC_C', name: 'Shanghai, CN', lat: 31.2304, lng: 121.4737, specialty: 'Component Forging', capacity: 40 }
];

// Structural BOM Matrix
const catalogItems = [
  { sku: 'COMP-FRAME-ST', name: 'Compose Panel Frame (Steel)', origin: 'FAC_B', cost: 120, carbonScore: 45 },
  { sku: 'COMP-FRAME-WD', name: 'Compose Panel Frame (Wood)', origin: 'FAC_A', cost: 150, carbonScore: 12 },
  { sku: 'COMP-SURF-LN', name: 'Laminate Worksurface', origin: 'FAC_A', cost: 80, carbonScore: 18 },
  { sku: 'COMP-TEXT-DK', name: 'Digital Knit Textile', origin: 'FAC_A', cost: 65, carbonScore: 5 }
];

// Target Cities Directory (For Haversine Distance Calculations)
const clientCities = [
  { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
  { name: 'New York, NY', lat: 40.7128, lng: -74.0060 },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278 }
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
  "volume": 300,
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
The algorithm must score and balance: Total Freight Distance (using Haversine distance math from your factory coordinates to the parsed targetLocation), Component Manufacturing Latency, and Carbon/Eco Weights.
Implement a toggle switch on the UI: [ Traditional Sequential Sort ] vs. [ Matrix Parallel Optimization ].
Traditional: Runs a rigorous, sequential baseline solver that prioritizes correctness and full traceability over speed.
Matrix Parallel: Executes a vectorized, parallel optimization path designed to preserve global-optimum quality while scaling to massive datasets.

Feature 3: Executive Business Dashboard (The "Wow" Factor)
The Interactive Map: Implement an interactive map (using react-map-gl, Leaflet, or responsive SVG coordinates) showing dynamic, colored lines lighting up from the chosen manufacturing nodes (Holland/Bruce) directly to the parsed delivery destination.
High-Impact KPI Cards: Render large, high-contrast metric displays showcasing:
- Total Estimated Cost ($): Dynamically recalculated based on user priority sliders.
- Carbon Footprint Reduction (%): Flashes green when eco-prioritization is enabled.
- Delivery Lead Time Window (Days): Driven by simulated factory capacity backlogs.

## 6. Coding Instructions & Prompt Syntax
"Copilot: Let's begin building the Next.js app. Generate clean, modular, typesafe components. Prioritize visual aesthetics that appeal to high-level executives—use dark mode accents, highly scannable grid layouts, short structural text formatting, and interactive sliders that alter the optimization math instantly without forcing page reloads. Let's start by setting up the Next.js project directory structure, the live OpenAI JSON API route handler, and the synthetic dataset modules first."