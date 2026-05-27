import { CheckCircle2, MapPin, Package, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { OptimizationResult } from '@/lib/types';

interface RecommendationBannerProps {
  result: OptimizationResult;
}

function topPriorityLabel(weights: OptimizationResult['weights']): string {
  const { carbonWeight, costWeight, speedWeight } = weights;
  const max = Math.max(carbonWeight, costWeight, speedWeight);
  if (carbonWeight === max) return 'lowest carbon footprint';
  if (costWeight === max) return 'lowest total cost';
  return 'fastest delivery';
}

export default function RecommendationBanner({ result }: RecommendationBannerProps) {
  const winner = result.breakdown[0];
  const priority = topPriorityLabel(result.weights);

  return (
    <Card className="border-emerald-800/50 bg-emerald-950/25">
      <CardContent className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-0.5">
              Recommended Configuration
            </p>
            <p className="text-sm font-semibold text-foreground leading-snug">
              {winner.itemName}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3 shrink-0" />
                {winner.factoryName}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {result.targetLocation}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span>{winner.freightDistanceKm.toLocaleString()} km freight</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Selected for{' '}
              <span className="text-foreground font-medium">{priority}</span>
              {' '}· searched{' '}
              <span className="text-foreground font-medium">
                {(result.searchedSkuCount ?? result.breakdown.length).toLocaleString()}
              </span>{' '}SKUs · resolved from{' '}
              <span className="text-foreground font-medium">{result.breakdown.length}</span>{' '}best matches
            </p>
          </div>
          <div className="shrink-0 text-right flex flex-col items-end gap-1">
            <Badge
              variant="outline"
              className="text-[10px] text-emerald-400 border-emerald-800/60 px-1.5"
            >
              {result.mode === 'parallel' ? 'Parallel' : 'Sequential'}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-mono">
              {result.solverDurationMs}ms
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
