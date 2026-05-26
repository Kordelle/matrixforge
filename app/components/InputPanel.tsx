'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { SolverMode } from '@/lib/types';

interface InputPanelProps {
  onAnalyze: (query: string, mode: SolverMode) => void;
  isLoading: boolean;
}

const EXAMPLE_QUERY =
  'Outfit a 3-floor office campus in Chicago using Compose workstations. Prioritize low carbon footprint and mid-range costs.';

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
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Supply Chain Request</label>
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={EXAMPLE_QUERY}
          className="min-h-[120px] resize-none bg-background text-foreground border-border placeholder:text-muted-foreground text-sm"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />
        <p className="text-xs text-muted-foreground">
          Ctrl+Enter to submit · LLM extracts location, volume &amp; priority weights
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={isParallel}
          onCheckedChange={setIsParallel}
          disabled={isLoading}
          id="solver-mode"
        />
        <label htmlFor="solver-mode" className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm text-muted-foreground">
            {isParallel ? 'Matrix Parallel' : 'Sequential Baseline'}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto">
            {isParallel ? 'NumPy' : 'Iterative'}
          </Badge>
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