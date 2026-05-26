# MatrixForge

A hybrid AI + high-dimensional optimization prototype for enterprise supply-chain and modular product planning. Natural-language business requests are parsed by a live LLM into structured JSON, scored across cost, carbon footprint, and delivery speed, then resolved by a Python vectorized compute engine — all visualized in a real-time executive dashboard.

## Why This Exists

Enterprise configuration and fulfillment decisions create combinatorial search spaces too large for traditional sequential workflows. MatrixForge demonstrates a practical, quantum-ready architecture that bridges conversational AI input with high-throughput matrix optimization — designed to plug into CUDA-Q or QPU hardware without re-architecture.

## Architecture

```
Browser (Next.js 16, React 19, Tailwind v4)
    │
    ▼
API Route  ──► OpenAI gpt-4o-mini  (structured JSON output)
    │
    ▼
FastAPI compute service  (Python 3.11, NumPy, SciPy)
    ├── Sequential solver  — rigorous baseline, full traceability
    └── Parallel solver    — vectorized NumPy arrays, global-optimum at scale
```

| Layer | Stack |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Shadcn/ui · Recharts |
| Orchestration | Next.js API routes · Zod validation · OpenAI SDK (`gpt-4o-mini`, `json_object`) |
| Compute | FastAPI · Pydantic v2 · NumPy 2 · SciPy |
| Infrastructure | Docker · Docker Compose |

## Features

**LLM Parsing Interface** — Paste any natural-language planning request (e.g. _"Outfit a 3-floor campus in Chicago, prioritize low carbon"_). The API route sends it to OpenAI with a strict JSON schema and extracts `targetLocation`, `volume`, and `weights` with zero parsing errors.

**Dual-Mode Optimization Sandbox** — Toggle between two solvers at runtime:
- *Traditional Sequential Sort* — iterative baseline, rigorous correctness, full per-candidate trace.
- *Matrix Parallel Optimization* — all haversine distances, freight costs, lead times, and composite scores computed as vectorized NumPy arrays. `argmin` selects the global optimum in a single pass.

**Priority Sliders** — Carbon / cost / speed weights are adjustable after the initial parse. Changing a slider triggers a re-optimization call to FastAPI (direct path, no LLM re-call) with a 600 ms debounce. Weights are sum-to-100 enforced with proportional redistribution.

**Executive Dashboard** — KPI cards (total cost, carbon reduction %, lead time), an SVG world map with animated route lines from the winning factory to the delivery city, and a per-SKU composite-score bar chart.

## Synthetic Dataset

All data is canonical, in-memory, and demo-safe — no proprietary data.

| Factory | Location | Specialty | Capacity |
|---|---|---|---|
| FAC_A | Holland, MI | Wood & Assembly | 85% |
| FAC_B | Bruce, MS | Steel & Seating | 90% |
| FAC_C | Shanghai, CN | Component Forging | 40% |

SKUs: `COMP-FRAME-ST` (steel frame, FAC_B) · `COMP-FRAME-WD` (wood frame, FAC_A) · `COMP-SURF-LN` (laminate surface, FAC_A) · `COMP-TEXT-DK` (digital knit textile, FAC_A)

Target delivery cities: Chicago IL · New York NY · London UK

## Repository Structure

```
matrixforge/
├── app/
│   ├── api/optimize/route.ts   # LLM gateway + FastAPI proxy
│   ├── components/
│   │   ├── DashboardGrid.tsx   # Root client component, owns all state
│   │   ├── InputPanel.tsx      # NL query textarea + solver mode toggle
│   │   ├── KpiCards.tsx        # Cost / carbon / lead-time KPI cards
│   │   ├── MetricsChart.tsx    # Recharts per-SKU composite score bar chart
│   │   └── WorldMap.tsx        # SVG equirectangular map with animated routes
│   ├── data/syntheticCatalog.ts
│   └── page.tsx
├── components/ui/              # Shadcn/ui components (Button, Slider, Switch…)
├── lib/
│   ├── types.ts                # Shared TS types matching FastAPI Pydantic aliases
│   └── utils.ts                # cn() + formatCurrency + formatPercent
├── python/
│   ├── data.py                 # Python mirror of syntheticCatalog.ts
│   ├── models.py               # Pydantic v2 models (camelCase aliases)
│   ├── solver.py               # Sequential + parallel solvers
│   ├── main.py                 # FastAPI app (POST /optimize, GET /health)
│   ├── requirements.txt
│   └── Dockerfile
├── Dockerfile                  # Multi-stage Next.js build (standalone output)
└── docker-compose.yml          # Orchestrates web + compute with health-check dependency
```

## Running with Docker (recommended)

Copy `.env.local.example` to `.env.local` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-...
FASTAPI_URL=http://localhost:8000
```

Then start both services:

```bash
docker compose up --build
```

Open http://localhost:3000. The `web` service waits for the `compute` health check to pass before starting.

## Running Locally (without Docker)

**Frontend:**
```bash
npm install
npm run dev          # http://localhost:3000
```

**Compute service** (separate terminal):
```bash
python -m uvicorn main:app \
  --app-dir c:/code/matrixforge/python \
  --reload --reload-dir c:/code/matrixforge/python \
  --port 8000
```

Verify the compute service: `GET http://localhost:8000/health` → `{"status":"ok","service":"matrixforge-compute"}`

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `OPENAI_API_KEY` | `.env.local` | OpenAI secret key — server-side only, never reaches the client bundle |
| `FASTAPI_URL` | `.env.local` / compose env | Base URL of the Python compute service (`http://localhost:8000` locally, `http://compute:8000` in Docker) |

## Notes

- All data is intentionally synthetic and demo-safe.
- `OPENAI_API_KEY` is never exposed to the browser — consumed only in `app/api/optimize/route.ts`.
- The Python solver modules use plain imports; uvicorn must be started with `--app-dir` pointing to `python/` when run outside Docker.
- Designed for internal review, roadmap alignment, and architecture validation.
