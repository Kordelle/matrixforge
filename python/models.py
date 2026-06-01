"""Pydantic v2 models for the MatrixForge Compute Engine API.

All models inherit CamelModel so JSON I/O uses camelCase field aliases,
matching the TypeScript types in lib/types.ts exactly.
"""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base model: camelCase aliases for JSON, snake_case for Python internals."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class SolverMode(str, Enum):
    sequential = "sequential"
    parallel = "parallel"


class OptimizationWeights(CamelModel):
    carbon_weight: float = Field(default=0.33, ge=0, le=1)
    cost_weight: float = Field(default=0.33, ge=0, le=1)
    speed_weight: float = Field(default=0.34, ge=0, le=1)


class SpaceMix(CamelModel):
    """Space-type allocation percentages — must sum to ≤ 1.0."""
    open_office_pct: float = Field(default=0.65, ge=0, le=1)
    enclosed_office_pct: float = Field(default=0.10, ge=0, le=1)
    conference_pct: float = Field(default=0.15, ge=0, le=1)
    lounge_pct: float = Field(default=0.10, ge=0, le=1)


class OptimizeRequest(CamelModel):
    target_location: str
    target_lat: float
    target_lng: float
    floors: int = Field(default=1, gt=0)
    sq_ft_per_floor: int = Field(default=10_000, gt=0)
    space_mix: SpaceMix = SpaceMix()
    weights: OptimizationWeights = OptimizationWeights()
    mode: SolverMode = SolverMode.parallel


class FactoryBreakdown(CamelModel):
    factory_id: str
    factory_name: str
    sku: str
    item_name: str
    freight_distance_km: float
    freight_cost_per_unit: float
    item_cost: float
    total_cost_per_unit: float
    carbon_score: int
    lead_time_days: float
    composite_score: float


class OptimizationResult(CamelModel):
    """Legacy single-winner result — kept for backward compatibility."""
    target_location: str
    target_lat: float
    target_lng: float
    volume: int
    weights: OptimizationWeights
    mode: SolverMode
    total_cost: float
    carbon_reduction_pct: float
    lead_time_days: float
    winning_factory_id: str
    winning_factory_name: str
    winning_sku: str
    breakdown: list[FactoryBreakdown]
    solver_duration_ms: float
    searched_sku_count: int = 0
    matched_sku_count: int = 0


# ---------------------------------------------------------------------------
# BOM project result models
# ---------------------------------------------------------------------------


class ActiveFactory(CamelModel):
    id: str
    name: str
    lat: float
    lng: float


class BomLine(CamelModel):
    category: str            # internal key e.g. "task_chair"
    category_label: str      # display label e.g. "Task Seating"
    sku: str
    item_name: str
    factory_id: str
    factory_name: str
    factory_lat: float
    factory_lng: float
    quantity: int
    unit_cost: float
    freight_cost_per_unit: float
    total_cost: float          # (unit_cost + freight_cost_per_unit) × quantity
    carbon_score: int          # per-unit score
    total_carbon: float        # carbon_score × quantity
    lead_time_days: float
    composite_score: float


class ProjectResult(CamelModel):
    target_location: str
    target_lat: float
    target_lng: float
    floors: int
    sq_ft_total: int
    weights: OptimizationWeights
    mode: SolverMode
    bom: list[BomLine]
    total_project_cost: float
    total_carbon_kg: float
    baseline_carbon_kg: float
    carbon_reduction_pct: float
    max_lead_time_days: float
    active_factory_count: int
    active_factories: list[ActiveFactory]
    solver_duration_ms: float
    searched_sku_count: int = 0
    matched_sku_count: int = 0
