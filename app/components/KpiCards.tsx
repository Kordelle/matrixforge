import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import type { ProjectResult } from '@/lib/types';
import { DollarSign, Leaf, Clock, Factory } from 'lucide-react';

interface KpiCardsProps {
  result: ProjectResult;
}

export default function KpiCards({ result }: KpiCardsProps) {
  const isEcoMode = result.weights.carbonWeight >= 0.5;
  const leadWeeks = Math.ceil(result.maxLeadTimeDays / 7);
  const carbonSavedKg = Math.round(result.baselineCarbonKg - result.totalCarbonKg);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Project Value */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <DollarSign className="h-3.5 w-3.5 text-amber-400" />
            Project Value
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-amber-400 tabular-nums">
            {formatCurrency(result.totalProjectCost)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {result.floors} floor{result.floors !== 1 ? 's' : ''} ·{' '}
            {(result.sqFtTotal / 1000).toFixed(0)}k sq ft
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
            Carbon Saved
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
            {carbonSavedKg.toLocaleString()} kg CO₂e vs all-steel
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
          <div className="text-2xl font-bold text-sky-400 tabular-nums">
            {leadWeeks}w
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {result.maxLeadTimeDays}d max · {result.targetLocation.split(',')[0]}
          </p>
        </CardContent>
      </Card>

      {/* Active Factories */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <Factory className="h-3.5 w-3.5 text-violet-400" />
            Supply Nodes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-violet-400 tabular-nums">
            {result.activeFactoryCount}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {result.activeFactories.map((f) => f.name.split(',')[0]).join(' · ')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
