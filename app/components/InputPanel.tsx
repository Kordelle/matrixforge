'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { SolverMode } from '@/lib/types';

interface InputPanelProps {
  onAnalyze: (query: string, mode: SolverMode) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  {
    title: 'Full office campus',
    query:
      'Outfit a 3-floor office campus in Chicago with about 30,000 sq ft total. Prioritize low carbon footprint and mid-range costs.',
  },
  {
    title: 'Furniture-only refresh',
    query:
      'Outfit a 2-floor, 18,000 sq ft workspace in Toronto with only chairs and lounge seating. Keep the design lightweight and fast to deliver.',
  },
  {
    title: 'Conference-heavy buildout',
    query:
      'Plan a 4-story executive office in New York with 42,000 sq ft total and a heavy conference-room focus. Prioritize collaboration areas and premium finishes.',
  },
];

function Step({ n, label, sub }: { n: number; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[56px] text-center">
      <div className="h-5 w-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
        {n}
      </div>
      <span className="text-[11px] font-medium text-foreground leading-tight">{label}</span>
      <span className="text-[10px] text-muted-foreground leading-tight">{sub}</span>
    </div>
  );
}

export default function InputPanel({ onAnalyze, isLoading }: InputPanelProps) {
  const [query, setQuery] = useState('');
  const [isParallel, setIsParallel] = useState(true);

  function handleSubmit() {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    onAnalyze(trimmed, isParallel ? 'parallel' : 'sequential');
  }

  return (
    <div className="flex flex-col gap-4">
      {/* How it works — 3 steps */}
      <div className="flex items-start gap-2">
        <Step n={1} label="Describe" sub="Plain English" />
        <div className="flex-1 border-t border-dashed border-border mt-2.5" />
        <Step n={2} label="AI Parses" sub="Location & priorities" />
        <div className="flex-1 border-t border-dashed border-border mt-2.5" />
        <Step n={3} label="Optimize" sub="Best config wins" />
      </div>

      {/* Input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Describe your project</label>
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Outfit a 3-floor office campus in Chicago using Compose workstations. Prioritize low carbon footprint and mid-range costs."
          className="min-h-[96px] resize-none bg-background text-foreground border-border placeholder:text-muted-foreground text-sm"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />
      </div>

      {/* Example chips */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Try an example</p>
        <div className="flex flex-col gap-1">
          {EXAMPLES.map((example) => (
            <button
              key={example.title}
              type="button"
              onClick={() => setQuery(example.query)}
              disabled={isLoading}
              className="flex flex-col items-start gap-1 text-left text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 hover:bg-primary/5 rounded-md px-2.5 py-2.5 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <span className="font-medium text-foreground">{example.title}</span>
              <span className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                {example.query}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Solver mode */}
      <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
        <Switch
          checked={isParallel}
          onCheckedChange={setIsParallel}
          disabled={isLoading}
          id="solver-mode"
          className="mt-0.5 shrink-0"
        />
        <label htmlFor="solver-mode" className="flex flex-col gap-0.5 cursor-pointer select-none">
          <span className="text-sm font-medium text-foreground">
            {isParallel ? 'Matrix Parallel' : 'Sequential Baseline'}
          </span>
          <span className="text-xs text-muted-foreground">
            {isParallel
              ? 'Vectorizes all configurations simultaneously — mirrors quantum-ready architecture'
              : 'Iterates one configuration at a time — full auditable decision trail'}
          </span>
        </label>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!query.trim() || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Analyzing…
          </span>
        ) : (
          'Analyze Supply Chain'
        )}
      </Button>
    </div>
  );
}