'use client';

import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { OptimizationResult, OptimizationWeights, SolverMode } from '@/lib/types';
import { factories } from '@/app/data/syntheticCatalog';
import InputPanel from './InputPanel';
import KpiCards from './KpiCards';
import MetricsChart from './MetricsChart';
import WorldMap from './WorldMap';

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

export default function DashboardGrid() {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sliders, setSliders] = useState<SliderValues>([33, 33, 34]);
  const [mode, setMode] = useState<SolverMode>('parallel');

  const parsedCacheRef = useRef<{
    targetLocation: string;
    targetLat: number;
    targetLng: number;
    volume: number;
  } | null>(null);
  const reoptimizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function callApi(body: Record<string, unknown>): Promise<OptimizationResult> {
    const res = await fetch('/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(err?.error ?? `Server error ${res.status}`);
    }
    return res.json() as Promise<OptimizationResult>;
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
        volume: data.volume,
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
    <div className="min-h-screen bg-background px-4 py-6 md:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">MatrixForge</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Multi-Variable Supply Chain Optimizer
            {result && (
              <>
                {' '}·{' '}
                <span className="font-mono">
                  {result.mode === 'parallel' ? 'Matrix Parallel' : 'Sequential'} ·{' '}
                  {result.solverDurationMs}ms
                </span>
              </>
            )}
          </p>
        </div>
        {result && (
          <Badge variant="outline" className="text-xs shrink-0 mt-1">
            {result.winningFactoryName} → {result.targetLocation}
          </Badge>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-5 px-5 pb-5">
              <InputPanel onAnalyze={handleAnalyze} isLoading={isLoading} />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Priority Weights
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {parsedCacheRef.current
                  ? 'Adjust to auto re-optimize (600ms debounce)'
                  : 'Populated from LLM inference after first analysis'}
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
        <div className="lg:col-span-2 flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!result && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center h-72 rounded-lg border border-dashed border-border text-center px-8">
              <p className="text-muted-foreground text-sm max-w-xs">
                Describe a supply chain request to run the optimizer.
              </p>
              <p className="text-muted-foreground/60 text-xs mt-2 italic">
                &ldquo;Outfit a 3-floor office in Chicago. Prioritize low carbon.&rdquo;
              </p>
            </div>
          )}

          {isLoading && !result && (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-24 rounded-lg bg-card border border-border" />
                ))}
              </div>
              <div className="h-52 rounded-lg bg-card border border-border" />
            </div>
          )}

          {result && (
            <div className={isLoading ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
              <div className="flex flex-col gap-4">
                <KpiCards result={result} />
                <WorldMap
                  factories={factories}
                  winningFactoryId={result.winningFactoryId}
                  targetCity={{
                    name: result.targetLocation,
                    lat: result.targetLat,
                    lng: result.targetLng,
                  }}
                />
                <MetricsChart breakdown={result.breakdown} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
