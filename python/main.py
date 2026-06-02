"""MatrixForge Compute Engine — FastAPI entry point.

Run from the python/ directory:
  uvicorn main:app --reload --port 7431

The Next.js API route at app/api/optimize/route.ts calls POST /optimize.

Startup sequence:
  1. Initialise ChromaCatalogStore (persistent client at ./data/chroma_db)
  2. Load first 1,000 items from catalog_seed.ndjson into memory (instant fallback)
  3. If collection is empty, launch background async indexing task
     (calls GitHub Models embeddings API — requires GITHUB_TOKEN)
  4. /optimize uses semantic search if indexed + semanticQuery present,
     else falls back to in-memory items
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import OptimizeRequest, ProjectResult
from solver import run_project_solver
from space_program import CATEGORY_META, calculate_space_program

logger = logging.getLogger(__name__)

NDJSON_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "data", "catalog_seed.ndjson"
)
CHROMA_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "data", "chroma_db"
)
FALLBACK_LIMIT = 1_000


# ---------------------------------------------------------------------------
# Lifespan — initialise vector store and background indexing
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise ChromaDB store and launch background indexing if needed."""
    # Lazy import so the server still starts when chromadb/openai aren't installed
    try:
        from vector_store import ChromaCatalogStore

        store = ChromaCatalogStore(persist_dir=CHROMA_PATH)
        fallback = store.load_fallback(NDJSON_PATH, limit=FALLBACK_LIMIT)
        app.state.store = store
        app.state.fallback_items = fallback
        app.state.indexing_complete = not store.is_empty
        app.state.indexing_in_progress = False

        if store.is_empty:
            logger.info(
                "ChromaDB collection empty — starting background indexing of %s",
                NDJSON_PATH,
            )
            app.state.indexing_in_progress = True

            async def _background_index():
                try:
                    indexed = await store.index_catalog_async(NDJSON_PATH)
                    app.state.indexing_complete = True
                    app.state.indexing_in_progress = False
                    logger.info("Background indexing done — %d SKUs.", indexed)
                except Exception as exc:  # noqa: BLE001
                    app.state.indexing_in_progress = False
                    logger.error("Background indexing failed: %s", exc)

            asyncio.create_task(_background_index())
        else:
            logger.info(
                "ChromaDB already indexed — %d SKUs available for semantic search.",
                store.total_skus,
            )
    except ImportError as exc:
        logger.warning("ChromaDB/OpenAI not available (%s) — using fallback only.", exc)
        app.state.store = None
        app.state.fallback_items = []
        app.state.indexing_complete = False
        app.state.indexing_in_progress = False

    yield  # application runs

    logger.info("MatrixForge compute engine shutting down.")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="MatrixForge Compute Engine",
    description="High-dimensional vectorized optimizer for B2B supply-chain configurations.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:7430"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_items(request_obj: Request, semantic_query: str | None) -> tuple[list[dict], int]:
    """Resolve which catalog items to pass to the solver.

    Returns (items, total_searched_count).
    Priority:
      1. ChromaDB semantic search (if indexed + query present)
      2. In-memory fallback items
    """
    store = getattr(request_obj.app.state, "store", None)
    fallback: list[dict] = getattr(request_obj.app.state, "fallback_items", [])
    indexing_complete: bool = getattr(request_obj.app.state, "indexing_complete", False)

    if store is not None and indexing_complete and semantic_query:
        results = store.semantic_search(semantic_query, n=200)
        if results:
            return results, store.total_skus

    # Use fallback (in-memory first 1,000 items from NDJSON)
    return fallback, len(fallback)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health(request: Request) -> dict:
    store = getattr(request.app.state, "store", None)
    return {
        "status": "ok",
        "service": "matrixforge-compute",
        "catalogIndexed": getattr(request.app.state, "indexing_complete", False),
        "indexingInProgress": getattr(request.app.state, "indexing_in_progress", False),
        "totalSkus": store.total_skus if store else 0,
    }


@app.get("/catalog/stats")
async def catalog_stats(request: Request) -> JSONResponse:
    """Return ChromaDB index statistics."""
    store = getattr(request.app.state, "store", None)
    fallback: list[dict] = getattr(request.app.state, "fallback_items", [])
    return JSONResponse(content={
        "totalSkus": store.total_skus if store else len(fallback),
        "indexedCount": store.total_skus if store else 0,
        "indexing": getattr(request.app.state, "indexing_in_progress", False),
        "fallbackCount": len(fallback),
    })


@app.post("/search")
async def search(body: dict, request: Request) -> JSONResponse:
    """Semantic SKU search. Body: { query: str, n?: int }"""
    query: str = body.get("query", "")
    n: int = int(body.get("n", 200))
    if not query:
        raise HTTPException(status_code=422, detail="query is required")
    store = getattr(request.app.state, "store", None)
    if store is None or not getattr(request.app.state, "indexing_complete", False):
        raise HTTPException(status_code=503, detail="Semantic index not yet ready")
    results = store.semantic_search(query, n=n)
    return JSONResponse(content={"results": results, "count": len(results)})


@app.post("/optimize", response_model=ProjectResult)
async def optimize(optimize_request: OptimizeRequest, request: Request) -> JSONResponse:
    """Build a full project BOM and return a ProjectResult.

    Flow:
      1. Calculate space program (floors × sq ft × mix → {category: quantity})
      2. For each BOM category, run a category-specific semantic search
      3. Score all candidates with vectorized composite algorithm
      4. Assemble BomLine winners into a ProjectResult
    """
    try:
        sp = calculate_space_program(
            floors=optimize_request.floors,
            sq_ft_per_floor=optimize_request.sq_ft_per_floor,
            open_office_pct=optimize_request.space_mix.open_office_pct,
            enclosed_office_pct=optimize_request.space_mix.enclosed_office_pct,
            conference_pct=optimize_request.space_mix.conference_pct,
            lounge_pct=optimize_request.space_mix.lounge_pct,
            scope_hint=optimize_request.scope_hint,
        )

        if not sp.bom_quantities:
            raise HTTPException(status_code=422, detail="Space program produced empty BOM.")

        # Resolve items per category via category-specific semantic search
        category_items: dict[str, list[dict]] = {}
        total_searched = 0
        for cat_key in sp.bom_quantities:
            cat_meta = CATEGORY_META.get(cat_key, {})
            semantic_q: str | None = cat_meta.get("semantic_query")
            items, searched = _get_items(request, semantic_q)
            category_items[cat_key] = items
            total_searched = max(total_searched, searched)

        if not any(category_items.values()):
            raise HTTPException(
                status_code=503,
                detail="Catalog not yet loaded. Retry in a few seconds.",
            )

        result = run_project_solver(optimize_request, category_items, sp)
        result.searched_sku_count = total_searched

        return JSONResponse(content=result.model_dump(by_alias=True))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
