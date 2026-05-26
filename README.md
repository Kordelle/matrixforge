# MatrixForge

MatrixForge is a hybrid AI + optimization prototype for enterprise supply-chain and modular product planning.

It captures natural-language business requests, transforms them into strict structured inputs, and runs optimization workflows that compare a sequential baseline against a scalable matrix-parallel path.

## Why This Exists

Enterprise configuration and fulfillment decisions can create combinatorial search spaces that are too large for traditional workflows.

MatrixForge demonstrates a practical architecture for:

- structured LLM parsing for planning inputs,
- synthetic but realistic multi-site manufacturing datasets,
- optimization tradeoffs across cost, carbon, and delivery speed,
- future alignment with accelerated compute and quantum-ready abstractions.

## Project Scope

- Public-safe: no proprietary client or internal business data.
- Dataset policy: canonical synthetic seed data in source modules, loaded in-memory at runtime.
- Presentation target: internal enterprise stakeholders evaluating scalable optimization workflows.

## Architecture

- Frontend: Next.js App Router + React + Tailwind + componentized dashboard UI.
- Orchestration/API: Next.js route handlers for request validation and LLM gateway flows.
- Compute: dedicated optimization path designed to scale to very large matrix workloads.
- AI: OpenAI structured-output parsing for deterministic downstream execution.

## Optimization Modes

- Traditional Sequential Sort: rigorous sequential baseline emphasizing correctness and traceability.
- Matrix Parallel Optimization: vectorized/parallel path for global-optimum quality at larger scales.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Repository Structure

- app: Next.js app routes, API routes, and global styles.
- components: dashboard and input UI building blocks.
- data: synthetic canonical dataset modules.
- lib: optimization math and shared utility logic.

## Notes

- This repository is intentionally synthetic and demo-safe.
- The implementation is designed for internal review, roadmap alignment, and architecture validation.
