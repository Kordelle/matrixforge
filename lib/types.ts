export type SolverMode = 'sequential' | 'parallel';

export interface OptimizationWeights {
  carbonWeight: number;
  costWeight: number;
  speedWeight: number;
}

/** Shape of the parsed LLM output, extended with resolved coordinates and solver mode. */
export interface ParsedRequest {
  targetLocation: string;
  targetLat: number;
  targetLng: number;
  volume: number;
  weights: OptimizationWeights;
  mode: SolverMode;
}

export interface FactoryBreakdown {
  factoryId: string;
  factoryName: string;
  sku: string;
  itemName: string;
  freightDistanceKm: number;
  freightCostPerUnit: number;
  itemCost: number;
  totalCostPerUnit: number;
  carbonScore: number;
  leadTimeDays: number;
  compositeScore: number;
}

/** Camelcase mirror of the Pydantic OptimizationResult model (aliased by_alias=True). */
export interface OptimizationResult {
  targetLocation: string;
  targetLat: number;
  targetLng: number;
  volume: number;
  weights: OptimizationWeights;
  mode: SolverMode;
  totalCost: number;
  carbonReductionPct: number;
  leadTimeDays: number;
  winningFactoryId: string;
  winningFactoryName: string;
  winningSku: string;
  breakdown: FactoryBreakdown[];
  solverDurationMs: number;
}
