export type SolverMode = 'sequential' | 'parallel';

export interface OptimizationWeights {
  carbonWeight: number;
  costWeight: number;
  speedWeight: number;
}

export interface SpaceMix {
  openOfficePct: number;
  enclosedOfficePct: number;
  conferencePct: number;
  loungePct: number;
}

/** Shape sent to FastAPI POST /optimize */
export interface ParsedRequest {
  targetLocation: string;
  targetLat: number;
  targetLng: number;
  floors: number;
  sqFtPerFloor: number;
  spaceMix: SpaceMix;
  weights: OptimizationWeights;
  mode: SolverMode;
}

export interface ActiveFactory {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface BomLine {
  category: string;
  categoryLabel: string;
  sku: string;
  itemName: string;
  factoryId: string;
  factoryName: string;
  factoryLat: number;
  factoryLng: number;
  quantity: number;
  unitCost: number;
  freightCostPerUnit: number;
  totalCost: number;
  carbonScore: number;
  totalCarbon: number;
  leadTimeDays: number;
  compositeScore: number;
}

export interface ProjectResult {
  targetLocation: string;
  targetLat: number;
  targetLng: number;
  floors: number;
  sqFtTotal: number;
  weights: OptimizationWeights;
  mode: SolverMode;
  bom: BomLine[];
  totalProjectCost: number;
  totalCarbonKg: number;
  baselineCarbonKg: number;
  carbonReductionPct: number;
  maxLeadTimeDays: number;
  activeFactoryCount: number;
  activeFactories: ActiveFactory[];
  solverDurationMs: number;
  searchedSkuCount: number;
  matchedSkuCount: number;
}
