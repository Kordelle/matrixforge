"""MatrixForge Compute Engine — dual-mode optimizer.

Two solver implementations that return identical OptimizationResult shapes:

  run_sequential_solver — rigorous, correctness-first iterative baseline.
    Prioritizes full traceability and explicit per-candidate scoring.
    Suitable for auditable outputs and smaller catalogs.

  run_parallel_solver — NumPy vectorized parallel path.
    Builds high-dimensional arrays for all items simultaneously; designed
    to scale to massive catalog sizes (10k+ SKUs) without re-architecture.

Both solvers share the same scoring model:
  composite = w_carbon * norm(carbon) + w_cost * norm(total_cost) + w_speed * norm(lead_time)
  winner = argmin(composite)
"""

import math
import time

import numpy as np

from data import CatalogItem, FACTORIES, FACTORY_INDEX
from models import (
    FactoryBreakdown,
    OptimizationResult,
    OptimizeRequest,
    SolverMode,
)


# ---------------------------------------------------------------------------
# Shared math utilities
# ---------------------------------------------------------------------------

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in km between two WGS-84 coordinates."""
    R = 6_371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def freight_cost_scalar(distance_km: float) -> float:
    """Tiered freight cost per unit (USD) based on distance."""
    if distance_km < 1_000:
        return distance_km * 0.04
    if distance_km < 8_000:
        return distance_km * 0.08
    return distance_km * 0.15


def lead_time_scalar(capacity: int, volume: int) -> float:
    """Estimated lead time in days based on factory load and order volume."""
    base = (100 - capacity) / 10.0 + 3.0
    pressure = volume / 100.0 * 0.5
    return round(base + pressure, 1)


def _normalize_list(values: list[float]) -> list[float]:
    lo, hi = min(values), max(values)
    if hi == lo:
        return [0.0] * len(values)
    return [(v - lo) / (hi - lo) for v in values]


# ---------------------------------------------------------------------------
# Vectorized NumPy utilities (parallel solver)
# ---------------------------------------------------------------------------

def _haversine_vectorized(
    lats: np.ndarray, lngs: np.ndarray, target_lat: float, target_lng: float
) -> np.ndarray:
    """Compute Haversine distances (km) from an array of points to one target."""
    R = 6_371.0
    phi1 = np.radians(lats)
    phi2 = np.radians(target_lat)
    dphi = np.radians(target_lat - lats)
    dlambda = np.radians(target_lng - lngs)
    a = np.sin(dphi / 2) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2) ** 2
    return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))


def _freight_cost_arr(distances: np.ndarray) -> np.ndarray:
    return np.where(
        distances < 1_000,
        distances * 0.04,
        np.where(distances < 8_000, distances * 0.08, distances * 0.15),
    )


def _normalize_arr(arr: np.ndarray) -> np.ndarray:
    lo, hi = arr.min(), arr.max()
    if hi == lo:
        return np.zeros_like(arr, dtype=float)
    return (arr - lo) / (hi - lo)


# ---------------------------------------------------------------------------
# Sequential solver — rigorous, correctness-first
# ---------------------------------------------------------------------------

def run_sequential_solver(
    request: OptimizeRequest,
    items: list[CatalogItem],
) -> OptimizationResult:
    """Iterative baseline: score each catalog item explicitly for full traceability."""
    start = time.perf_counter()

    raw: list[dict] = []
    for item in items:
        factory = FACTORY_INDEX[item["origin"]]
        dist = haversine_distance(factory["lat"], factory["lng"], request.target_lat, request.target_lng)
        freight = freight_cost_scalar(dist)
        lead = lead_time_scalar(factory["capacity"], request.volume)
        total_cost = item["cost"] + freight
        raw.append(
            {
                "factory": factory,
                "item": item,
                "freight_distance_km": dist,
                "freight_cost_per_unit": freight,
                "item_cost": float(item["cost"]),
                "total_cost_per_unit": total_cost,
                "carbon_score": item["carbon_score"],
                "lead_time_days": lead,
            }
        )

    total_costs = [r["total_cost_per_unit"] for r in raw]
    carbons = [float(r["carbon_score"]) for r in raw]
    lead_times = [r["lead_time_days"] for r in raw]

    norm_costs = _normalize_list(total_costs)
    norm_carbons = _normalize_list(carbons)
    norm_speeds = _normalize_list(lead_times)

    w = request.weights
    breakdown: list[FactoryBreakdown] = []
    for i, r in enumerate(raw):
        composite = (
            w.carbon_weight * norm_carbons[i]
            + w.cost_weight * norm_costs[i]
            + w.speed_weight * norm_speeds[i]
        )
        breakdown.append(
            FactoryBreakdown(
                factory_id=r["factory"]["id"],
                factory_name=r["factory"]["name"],
                sku=r["item"]["sku"],
                item_name=r["item"]["name"],
                freight_distance_km=round(r["freight_distance_km"], 2),
                freight_cost_per_unit=round(r["freight_cost_per_unit"], 2),
                item_cost=r["item_cost"],
                total_cost_per_unit=round(r["total_cost_per_unit"], 2),
                carbon_score=int(r["carbon_score"]),
                lead_time_days=r["lead_time_days"],
                composite_score=round(composite, 4),
            )
        )

    breakdown.sort(key=lambda b: b.composite_score)
    winner = breakdown[0]

    max_carbon = max(carbons)
    carbon_reduction = (1 - winner.carbon_score / max_carbon) * 100 if max_carbon > 0 else 0.0

    return OptimizationResult(
        target_location=request.target_location,
        target_lat=request.target_lat,
        target_lng=request.target_lng,
        volume=request.volume,
        weights=request.weights,
        mode=SolverMode.sequential,
        total_cost=round(winner.total_cost_per_unit * request.volume, 2),
        carbon_reduction_pct=round(carbon_reduction, 1),
        lead_time_days=winner.lead_time_days,
        winning_factory_id=winner.factory_id,
        winning_factory_name=winner.factory_name,
        winning_sku=winner.sku,
        breakdown=breakdown,
        solver_duration_ms=round((time.perf_counter() - start) * 1000, 2),
    )


# ---------------------------------------------------------------------------
# Parallel solver — NumPy vectorized
# ---------------------------------------------------------------------------

def run_parallel_solver(
    request: OptimizeRequest,
    items: list[CatalogItem],
) -> OptimizationResult:
    """Vectorized path: build per-item arrays and score the entire catalog in one pass.

    Each catalog item is associated with its origin factory. All Haversine
    distances, freight costs, lead times, and composite scores are computed
    simultaneously via NumPy broadcasting — designed to scale to 24k+ SKUs
    without re-architecture when the catalog grows.
    """
    start = time.perf_counter()

    n = len(items)

    # Resolve per-item origin factory properties into parallel arrays
    origin_lats = np.empty(n)
    origin_lngs = np.empty(n)
    origin_caps = np.empty(n, dtype=float)
    item_costs = np.empty(n)
    item_carbons = np.empty(n, dtype=float)

    for i, item in enumerate(items):
        factory = FACTORY_INDEX[item["origin"]]
        origin_lats[i] = factory["lat"]
        origin_lngs[i] = factory["lng"]
        origin_caps[i] = factory["capacity"]
        item_costs[i] = item["cost"]
        item_carbons[i] = item["carbon_score"]

    # All items scored in one vectorized pass
    distances = _haversine_vectorized(origin_lats, origin_lngs, request.target_lat, request.target_lng)
    freight_costs = _freight_cost_arr(distances)
    lead_times = (100 - origin_caps) / 10.0 + 3.0 + (request.volume / 100.0 * 0.5)
    total_costs = item_costs + freight_costs

    # Normalize each metric 0-1 across all items
    norm_cost = _normalize_arr(total_costs)
    norm_carbon = _normalize_arr(item_carbons)
    norm_speed = _normalize_arr(lead_times)

    w = request.weights
    composite = w.carbon_weight * norm_carbon + w.cost_weight * norm_cost + w.speed_weight * norm_speed

    best_idx = int(np.argmin(composite))

    breakdown: list[FactoryBreakdown] = []
    for i, item in enumerate(items):
        factory = FACTORY_INDEX[item["origin"]]
        breakdown.append(
            FactoryBreakdown(
                factory_id=factory["id"],
                factory_name=factory["name"],
                sku=item["sku"],
                item_name=item["name"],
                freight_distance_km=round(float(distances[i]), 2),
                freight_cost_per_unit=round(float(freight_costs[i]), 2),
                item_cost=float(item["cost"]),
                total_cost_per_unit=round(float(total_costs[i]), 2),
                carbon_score=int(item["carbon_score"]),
                lead_time_days=round(float(lead_times[i]), 1),
                composite_score=round(float(composite[i]), 4),
            )
        )

    breakdown.sort(key=lambda b: b.composite_score)
    winner = breakdown[0]

    max_carbon = float(item_carbons.max())
    carbon_reduction = (1 - items[best_idx]["carbon_score"] / max_carbon) * 100 if max_carbon > 0 else 0.0

    return OptimizationResult(
        target_location=request.target_location,
        target_lat=request.target_lat,
        target_lng=request.target_lng,
        volume=request.volume,
        weights=request.weights,
        mode=SolverMode.parallel,
        total_cost=round(float(total_costs[best_idx]) * request.volume, 2),
        carbon_reduction_pct=round(carbon_reduction, 1),
        lead_time_days=round(float(lead_times[best_idx]), 1),
        winning_factory_id=FACTORY_INDEX[items[best_idx]["origin"]]["id"],
        winning_factory_name=FACTORY_INDEX[items[best_idx]["origin"]]["name"],
        winning_sku=items[best_idx]["sku"],
        breakdown=breakdown,
        solver_duration_ms=round((time.perf_counter() - start) * 1000, 2),
    )
