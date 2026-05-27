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


class OptimizeRequest(CamelModel):
    target_location: str
    target_lat: float
    target_lng: float
    volume: int = Field(gt=0)
    weights: OptimizationWeights = OptimizationWeights()
    mode: SolverMode = SolverMode.parallel
    semantic_query: str | None = None  # camelCase alias: semanticQuery


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
    searched_sku_count: int = 0  # camelCase alias: searchedSkuCount
    matched_sku_count: int = 0   # camelCase alias: matchedSkuCount
