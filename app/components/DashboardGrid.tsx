'use client';

import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProjectResult, SpaceMix, SolverMode } from '@/lib/types';
import { factories } from '@/app/data/syntheticCatalog';
import InputPanel from './InputPanel';
import KpiCards from './KpiCards';
import MetricsChart from './MetricsChart';
import WorldMap from './WorldMap';
import BomTable from './BomTable';

const SURFACE_CLASS = 'border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.35)]';

type FitOutScenario = {
  id: string;
  title: string;
  description: string;
  spaceMix: SpaceMix;
};

const FIT_OUT_SCENARIOS: FitOutScenario[] = [
  {
    id: 'chair-heavy',
    title: 'Chair-heavy refresh',
    description: 'Best when the request is seating-centric or literally says "only chairs".',
    spaceMix: {
      openOfficePct: 0.20,
      enclosedOfficePct: 0.15,
      conferencePct: 0.10,
      loungePct: 0.55,
    },
  },
  {
    id: 'balanced-office',
    title: 'Balanced office baseline',
    description: 'A practical full-fitout mix for a standard office campus.',
    spaceMix: {
      openOfficePct: 0.55,
      enclosedOfficePct: 0.10,
      conferencePct: 0.20,
      loungePct: 0.15,
    },
  },
  {
    id: 'collaboration-suite',
    title: 'Collaboration suite',
    description: 'Biases the space toward meeting rooms and breakout areas.',
    spaceMix: {
      openOfficePct: 0.30,
      enclosedOfficePct: 0.10,
      conferencePct: 0.35,
      loungePct: 0.25,
    },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardGrid({ googleMapsApiKey = '' }: { googleMapsApiKey?: string }) {
  const [result, setResult] = useState<ProjectResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<SolverMode>('parallel');

  const parsedCacheRef = useRef<{
    targetLocation: string;
    targetLat: number;
    targetLng: number;
    floors: number;
    sqFtPerFloor: number;
    spaceMix: SpaceMix;
    scopeHint: 'full_fitout' | 'furniture_only' | 'collaboration_focus' | 'office_shell';
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
        spaceMix: {
          openOfficePct: 0.65,
          enclosedOfficePct: 0.10,
          conferencePct: 0.15,
          loungePct: 0.10,
        },
        scopeHint: data.scopeHint,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleScenarioPreview(spaceMix: SpaceMix) {
    const cache = parsedCacheRef.current;
    if (!cache) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await callApi({
        ...cache,
        spaceMix,
        mode,
      });
      setResult(data);
      parsedCacheRef.current = { ...cache, spaceMix };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
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
                <Badge className="border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/10">
                  In Development
                </Badge>
                <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/10">
                  Synthetic Data
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
                  Analyze workspace requirements, generate a full Bill Of Materials, and route logistics to the best factories.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  24,904 synthetic SKUs
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  5 manufacturing facilities
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  Floor Plan → BOM expansion
                </span>
              </div>
            </div>

            {result && (
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Badge variant="outline" className="border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
                  {result.activeFactoryCount} active factor{result.activeFactoryCount !== 1 ? 'ies' : 'y'}
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

          {result && (
            <div className="mt-3 rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-xs text-sky-100">
              <span className="font-semibold uppercase tracking-[0.18em] text-sky-200">Inferred scope</span>
              <p className="mt-1 text-sm text-slate-100">
                {result.scopeHint === 'furniture_only' && 'Furniture-only request detected. Structural shell categories are suppressed so the BOM reflects what the user actually asked for.'}
                {result.scopeHint === 'collaboration_focus' && 'Collaboration-heavy request detected. Conference and lounge categories are prioritized ahead of office shell expansion.'}
                {result.scopeHint === 'office_shell' && 'Office-shell request detected. Structural and support categories take priority over furniture-heavy fit-out items.'}
                {result.scopeHint === 'full_fitout' && 'Full fit-out detected. The engine is solving the complete office package and then surfacing adjacent planning scenarios.'}
              </p>
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
                  Describe a workspace project. MatrixForge uses AI to extract the specs of your
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

          {result && parsedCacheRef.current && (
            <Card className={SURFACE_CLASS}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Planning Scenarios
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Explore adjacent fit-out interpretations before locking the BOM. This makes the app
                  behave like a planning engine, not just a single-shot calculator.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3 px-5 pb-5">
                {FIT_OUT_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => handleScenarioPreview(scenario.spaceMix)}
                    disabled={isLoading}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-sky-400/40 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{scenario.title}</p>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                        preview
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-300">{scenario.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-slate-300">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-200">
                        Open {Math.round(scenario.spaceMix.openOfficePct * 100)}%
                      </span>
                      <span className="rounded-full bg-violet-500/10 px-2 py-1 text-violet-200">
                        Conf {Math.round(scenario.spaceMix.conferencePct * 100)}%
                      </span>
                      <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-200">
                        Lounge {Math.round(scenario.spaceMix.loungePct * 100)}%
                      </span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
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
