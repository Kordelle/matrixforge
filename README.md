# MatrixForge

A BOM-first hybrid AI prototype for enterprise supply-chain and modular product planning. Natural-language business requests are parsed by a live LLM into structured space-program JSON, expanded into a full Bill of Materials, scored across cost, carbon footprint, and delivery speed, and resolved by a Python FastAPI compute engine — all visualized in a real-time executive dashboard.

## Why This Exists

Enterprise configuration and fulfillment decisions create combinatorial search spaces too large for traditional sequential workflows. MatrixForge demonstrates a practical, quantum-ready architecture that bridges conversational AI input with a BOM expansion engine and high-throughput optimization — designed to plug into CUDA-Q or QPU hardware without re-architecture.

## Architecture

```
Browser (Next.js 16, React 19, Tailwind v4)
    │
    ▼
API Route  ──► OpenAI gpt-4o-mini  (structured JSON output: floors, sq ft, space mix, weights)
    │
    ▼
FastAPI compute service  (Python 3.11, NumPy, ChromaDB)
    ├── Space program engine  — floors + sq ft + mix → BOM quantities
    ├── Sequential solver    — rigorous baseline, full traceability
    └── Parallel solver      — vectorized NumPy arrays, global-optimum at scale
```

| Layer | Stack |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Shadcn/ui · Recharts |
| Orchestration | Next.js API routes · Zod validation · OpenAI SDK (`gpt-4o-mini`, `json_object`) |
| Compute | FastAPI · Pydantic v2 · NumPy 2 · ChromaDB · SciPy |
| Infrastructure | Docker · Docker Compose |

## Features

**LLM Parsing Interface** — Paste any natural-language planning request (e.g. _"Outfit a 3-floor campus in Chicago, prioritize low carbon"_). The API route sends it to OpenAI with a strict JSON schema and extracts `targetLocation`, `floors`, `sqFtPerFloor`, `spaceMix`, and `weights` with zero parsing errors.

**Dual-Mode Optimization Sandbox** — Toggle between two solvers at runtime:
- *Traditional Sequential Sort* — iterative baseline, rigorous correctness, full per-candidate trace.
- *Matrix Parallel Optimization* — all haversine distances, freight costs, lead times, and composite scores computed as vectorized NumPy arrays. `argmin` selects the global optimum in a single pass.

**Priority Sliders** — Carbon / cost / speed weights are adjustable after the initial parse. Changing a slider triggers a re-optimization call to FastAPI (direct path, no LLM re-call) with a 600 ms debounce. Weights are sum-to-100 enforced with proportional redistribution.

**Executive Dashboard** — KPI cards (project cost, carbon savings, lead time, active factory count), an SVG world map with animated route lines from all active factories to the delivery city, a BOM table, and a category cost chart.

## Synthetic Dataset

All data is canonical, in-memory, and demo-safe — no proprietary data.

| Factory | Location | Specialty | Capacity |
|---|---|---|---|
| FAC_A | Holland, MI | Wood & Assembly | 85% |
| FAC_B | Bruce, MS | Steel & Seating | 90% |
| FAC_C | Shanghai, CN | Component Forging | 40% |

Additional active nodes: FAC_D Monterrey, MX and FAC_E Warsaw, PL.

SKUs: `COMP-FRAME-ST` (steel frame, FAC_B) · `COMP-FRAME-WD` (wood frame, FAC_A) · `COMP-SURF-LN` (laminate surface, FAC_A) · `COMP-TEXT-DK` (digital knit textile, FAC_A) · `COMP-CHAIR-TK` (task chair kit, FAC_B) · `COMP-POWER-MD` (power module, FAC_E)

Target delivery cities: Chicago IL · New York NY · London UK · Toronto Canada · Mexico City Mexico

## Repository Structure

```
matrixforge/
├── app/
│   ├── api/optimize/route.ts   # LLM gateway + FastAPI proxy
│   ├── components/
│   │   ├── DashboardGrid.tsx   # Root client component, owns all state
│   │   ├── InputPanel.tsx      # NL query textarea + solver mode toggle
│   │   ├── KpiCards.tsx        # Cost / carbon / lead-time / factory KPI cards
│   │   ├── BomTable.tsx        # Full BOM table with factory routing + totals
│   │   ├── MetricsChart.tsx    # Recharts category cost chart
│   │   └── WorldMap.tsx        # SVG equirectangular map with active routes
│   ├── data/syntheticCatalog.ts
│   └── page.tsx
├── components/ui/              # Shadcn/ui components (Button, Slider, Switch…)
├── lib/
│   ├── types.ts                # Shared TS types matching FastAPI Pydantic aliases
│   └── utils.ts                # cn() + formatCurrency + formatPercent
├── python/
│   ├── data.py                 # Python mirror of syntheticCatalog.ts
│   ├── models.py               # Pydantic v2 models (camelCase aliases)
│   ├── space_program.py        # Floors + sq ft + mix → BOM quantity engine
│   ├── solver.py               # Sequential + parallel solvers
│   ├── main.py                 # FastAPI app (POST /optimize, GET /health)
│   ├── requirements.txt
│   └── Dockerfile
├── Dockerfile                  # Multi-stage Next.js build (standalone output)
└── docker-compose.yml          # Orchestrates web + compute with health-check dependency
```

## Running with Docker (recommended)

Copy `.env.local.example` to `.env.local` and add your GitHub classic PAT:

```
GITHUB_TOKEN=github_pat_...
FASTAPI_URL=http://localhost:7431
```

Then start both services:

```bash
docker compose up --build
```

Open http://localhost:7430. The `web` service waits for the `compute` health check to pass before starting.

## Running Locally (without Docker)

**Frontend:**
```bash
npm install
npm run dev          # http://localhost:7430
```

**Compute service** (separate terminal):
```bash
python -m uvicorn main:app \
  --app-dir c:/code/matrixforge/python \
  --reload --reload-dir c:/code/matrixforge/python \
  --port 7431
```

Verify the compute service: `GET http://localhost:7431/health` → `{"status":"ok","service":"matrixforge-compute"}`

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GITHUB_TOKEN` | `.env.local` | GitHub classic PAT with `models:read` scope — used against `https://models.inference.ai.azure.com` — server-side only, never reaches the client bundle |
| `FASTAPI_URL` | `.env.local` / compose env | Base URL of the Python compute service (`http://localhost:7431` locally, `http://compute:7431` in Docker) |

## Notes

- All data is intentionally synthetic and demo-safe.
- `GITHUB_TOKEN` is never exposed to the browser — consumed only in `app/api/optimize/route.ts`.
- The Python solver now returns a BOM-first `ProjectResult` with `BomLine[]`, active factories, aggregate carbon savings, and lead-time metrics.
- The Python solver modules use plain imports; uvicorn must be started with `--app-dir` pointing to `python/` when run outside Docker.
- Designed for internal review, roadmap alignment, and architecture validation.
