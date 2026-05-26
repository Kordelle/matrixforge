"""MatrixForge Compute Engine — FastAPI entry point.

Run from the python/ directory:
  uvicorn main:app --reload --port 8000

The Next.js API route at app/api/optimize/route.ts calls POST /optimize.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import OptimizeRequest, OptimizationResult, SolverMode
from solver import run_parallel_solver, run_sequential_solver

app = FastAPI(
    title="MatrixForge Compute Engine",
    description="High-dimensional vectorized optimizer for B2B supply-chain configurations.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "matrixforge-compute"}


@app.post("/optimize", response_model=OptimizationResult)
async def optimize(request: OptimizeRequest) -> JSONResponse:
    """Run the selected solver and return a fully scored OptimizationResult.

    Sequential mode — rigorous iterative baseline, correctness-first.
    Parallel mode   — NumPy vectorized, designed for massive catalog scale.
    """
    try:
        solver = (
            run_sequential_solver
            if request.mode == SolverMode.sequential
            else run_parallel_solver
        )
        result: OptimizationResult = solver(request)
        # Serialize with camelCase aliases to match TypeScript types
        return JSONResponse(content=result.model_dump(by_alias=True))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
