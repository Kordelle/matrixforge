'use client';

import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { OptimizationWeights, ProjectResult, SpaceMix, SolverMode } from '@/lib/types';
import { factories } from '@/app/data/syntheticCatalog';
import InputPanel from './InputPanel';
import KpiCards from './KpiCards';
import MetricsChart from './MetricsChart';
import WorldMap from './WorldMap';
import BomTable from './BomTable';

const SURFACE_CLASS = 'border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.35)]';

// ---------------------------------------------------------------------------
// Weight slider helpers
// ---------------------------------------------------------------------------

type SliderValues = [number, number, number]; // [carbon%, cost%, speed%] — always sum to 100

function redistributeSliders(
  current: SliderValues,
  changedIdx: number,
  newVal: number,
): SliderValues {
  const clamped = Math.max(0, Math.min(100, Math.round(newVal)));
  const others = ([0, 1, 2] as const).filter((i) => i !== changedIdx) as [number, number];
  const remaining = 100 - clamped;

  if (remaining <= 0) {
    const result: SliderValues = [0, 0, 0];
    result[changedIdx] = 100;
    return result;
  }

  const otherSum = current[others[0]] + current[others[1]];
  if (otherSum === 0) {
    const half = Math.floor(remaining / 2);
    const result: SliderValues = [0, 0, 0];
    result[changedIdx] = clamped;
    result[others[0]] = half;
    result[others[1]] = remaining - half;
    return result;
  }

  const result: SliderValues = [0, 0, 0];
  result[changedIdx] = clamped;
  result[others[0]] = Math.round((current[others[0]] / otherSum) * remaining);
  result[others[1]] = remaining - result[others[0]];
  return result;
}

function slidersToWeights(sliders: SliderValues): OptimizationWeights {
  return {
    carbonWeight: sliders[0] / 100,
    costWeight: sliders[1] / 100,
    speedWeight: sliders[2] / 100,
  };
}

const SLIDER_LABELS = ['Carbon', 'Cost', 'Speed'] as const;
const SLIDER_COLORS = ['text-emerald-400', 'text-amber-400', 'text-sky-400'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardGrid({ googleMapsApiKey = '' }: { googleMapsApiKey?: string }) {
  const [result, setResult] = useState<ProjectResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sliders, setSliders] = useState<SliderValues>([33, 33, 34]);
  const [mode, setMode] = useState<SolverMode>('parallel');

  const parsedCacheRef = useRef<{
    targetLocation: string;
    targetLat: number;
    targetLng: number;
    floors: number;
    sqFtPerFloor: number;
    spaceMix: SpaceMix;
  } | null>(null);
  const reoptimizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function callApi(body: Record<string, unknown>): Promise<ProjectResult> {
    const res = await fetch('/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(err?.error ?? `Server error ${res.status}`);
    }
    return res.json() as Promise<ProjectResult>;
  }

  async function handleAnalyze(query: string, solverMode: SolverMode) {
    setMode(solverMode);
    setIsLoading(true);
    setError(null);
    try {
      const data = await callApi({ query, mode: solverMode });
      setResult(data);
      parsedCacheRef.current = {
        targetLocation: data.targetLocation,
        targetLat: data.targetLat,
        targetLng: data.targetLng,
        floors: data.floors,
        sqFtPerFloor: Math.round(data.sqFtTotal / data.floors),
        spaceMix: data.weights
          ? {
              openOfficePct: 0.65,
              enclosedOfficePct: 0.10,
              conferencePct: 0.15,
              loungePct: 0.10,
            }
          : {
              openOfficePct: 0.65,
              enclosedOfficePct: 0.10,
              conferencePct: 0.15,
              loungePct: 0.10,
            },
      };
      setSliders([
        Math.round(data.weights.carbonWeight * 100),
        Math.round(data.weights.costWeight * 100),
        Math.round(data.weights.speedWeight * 100),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReoptimize(newSliders: SliderValues, solverMode: SolverMode) {
    const cache = parsedCacheRef.current;
    if (!cache) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await callApi({ ...cache, weights: slidersToWeights(newSliders), mode: solverMode });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSliderChange(idx: number, newVal: number) {
    const newSliders = redistributeSliders(sliders, idx, newVal);
    setSliders(newSliders);
    if (parsedCacheRef.current) {
      if (reoptimizeTimer.current) clearTimeout(reoptimizeTimer.current);
      reoptimizeTimer.current = setTimeout(() => handleReoptimize(newSliders, mode), 600);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(168,85,247,0.12),_transparent_24%),linear-gradient(180deg,_#060816_0%,_#050816_100%)] px-4 py-6 text-slate-100 md:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />
      <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-32 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-[1600px] flex-col gap-4">
        {/* Header */}
        <header className={`${SURFACE_CLASS} rounded-2xl px-5 py-4 md:px-6`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/10">
                  BOM-first console
                </Badge>
                <Badge variant="outline" className="border-sky-400/30 bg-sky-500/10 text-sky-200">
                  Live LLM + FastAPI + ChromaDB
                </Badge>
                {result && (
                  <Badge variant="outline" className="border-violet-400/30 bg-violet-500/10 text-violet-200">
                    {result.mode === 'parallel' ? 'Matrix Parallel' : 'Sequential'} · {result.solverDurationMs}ms
                  </Badge>
                )}
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  MatrixForge
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 md:text-[15px]">
                  Parse a space program, generate a full BOM, and route every category to the best factories.
                  The UI is now BOM-first: category lines, active factories, carbon savings, and project totals.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  24,904 synthetic SKUs
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  5 manufacturing nodes
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  Space mix → BOM expansion
                </span>
              </div>
            </div>

            {result && (
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Badge variant="outline" className="border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
                  {result.activeFactoryCount} active factory{result.activeFactoryCount !== 1 ? 'ies' : 'y'}
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
                  {result.bom.length} BOM categories
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
                  {result.targetLocation}
                </Badge>
              </div>
            )}
          </div>

          {result && (
            <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300 sm:grid-cols-3">
              <div>
                <p className="uppercase tracking-[0.18em] text-slate-400">Project footprint</p>
                <p className="mt-1 text-sm font-medium text-white">{result.floors} floors · {(result.sqFtTotal / 1000).toFixed(0)}k sq ft</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.18em] text-slate-400">Active factories</p>
                <p className="mt-1 text-sm font-medium text-white">{result.activeFactories.map((f) => f.name.split(',')[0]).join(' · ')}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.18em] text-slate-400">Carbon delta</p>
                <p className="mt-1 text-sm font-medium text-white">{Math.round(result.baselineCarbonKg - result.totalCarbonKg).toLocaleString()} kg CO2e saved</p>
              </div>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <Card className={SURFACE_CLASS}>
            <CardContent className="pt-5 px-5 pb-5">
              <InputPanel onAnalyze={handleAnalyze} isLoading={isLoading} />
            </CardContent>
          </Card>

          <Card className={SURFACE_CLASS}>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Optimization Weights
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {parsedCacheRef.current
                  ? 'Drag to live re-optimize · applied automatically'
                  : 'Inferred from your request after first analysis · drag to adjust'}
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5 flex flex-col gap-4">
              {SLIDER_LABELS.map((label, i) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${SLIDER_COLORS[i]}`}>{label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums font-mono">
                      {sliders[i]}%
                    </span>
                  </div>
                  <Slider
                    value={[sliders[i]]}
                    onValueChange={(val) => {
                      const v = Array.isArray(val) ? (val[0] as number) : (val as number);
                      handleSliderChange(i, v);
                    }}
                    min={0}
                    max={100}
                    step={1}
                    disabled={isLoading}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right columns — results */}
        <div className="flex flex-col gap-4">
          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!result && !isLoading && !error && (
            <div className={`${SURFACE_CLASS} rounded-2xl px-6 py-6 flex flex-col gap-4`}>
              <div>
                <p className="text-sm font-semibold text-white">Run your first analysis</p>
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed max-w-2xl">
                  Describe a workspace project below. MatrixForge uses AI to extract the space
                  program (floors, sq ft, space mix), then builds a full Bill of Materials — scoring
                  every factory × component pairing across cost, carbon, and freight across{' '}
                  <span className="text-white font-medium">24,904 synthetic SKUs</span> in
                  ChromaDB across{' '}
                  <span className="text-white font-medium">
                    {factories.length} manufacturing nodes
                  </span>
                  .
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Active manufacturing nodes
                </p>
                <div className="flex flex-wrap gap-2">
                  {factories.map((f) => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                      <span className="font-medium text-white">{f.name}</span>
                      <span className="text-slate-400">· {f.specialty}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isLoading && !result && (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className={`${SURFACE_CLASS} h-24 rounded-xl`} />
                ))}
              </div>
              <div className={`${SURFACE_CLASS} h-52 rounded-xl`} />
            </div>
          )}

          {result && (
            <div
              className={
                isLoading
                  ? 'opacity-50 pointer-events-none transition-opacity'
                  : 'transition-opacity'
              }
            >
              <div className="flex flex-col gap-4">
                <KpiCards result={result} />
                <BomTable bom={result.bom} totalProjectCost={result.totalProjectCost} />
                <WorldMap
                  apiKey={googleMapsApiKey}
                  activeFactories={result.activeFactories}
                  targetCity={{
                    name: result.targetLocation,
                    lat: result.targetLat,
                    lng: result.targetLng,
                  }}
                />
                <MetricsChart bom={result.bom} />
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
