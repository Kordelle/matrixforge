import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import type { OptimizationResult } from '@/lib/types';
import { DollarSign, Leaf, Clock } from 'lucide-react';

interface KpiCardsProps {
  result: OptimizationResult;
}

export default function KpiCards({ result }: KpiCardsProps) {
  const isEcoMode = result.weights.carbonWeight >= 0.5;

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Total Cost */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <DollarSign className="h-3.5 w-3.5 text-amber-400" />
            Total Cost
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-amber-400 tabular-nums">
            {formatCurrency(result.totalCost)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {result.volume} units · {result.winningFactoryName.split(',')[0]}
          </p>
        </CardContent>
      </Card>

      {/* Carbon Reduction */}
      <Card
        className={cn(
          'border-border transition-colors',
          isEcoMode ? 'bg-emerald-950/40' : 'bg-card',
        )}
      >
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <Leaf
              className={cn(
                'h-3.5 w-3.5',
                isEcoMode ? 'text-emerald-400' : 'text-muted-foreground',
              )}
            />
            Carbon Reduction
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div
            className={cn(
              'text-2xl font-bold tabular-nums',
              isEcoMode ? 'text-emerald-400' : 'text-foreground',
            )}
          >
            {formatPercent(result.carbonReductionPct)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            vs highest-carbon option
          </p>
        </CardContent>
      </Card>

      {/* Lead Time */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <Clock className="h-3.5 w-3.5 text-sky-400" />
            Lead Time
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-sky-400 tabular-nums">{result.leadTimeDays}d</div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {result.winningFactoryName.split(',')[0]} → {result.targetLocation.split(',')[0]}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}