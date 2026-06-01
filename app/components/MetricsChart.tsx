'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BomLine } from '@/lib/types';

// Factory color fill per FAC slot — mirrors BomTable and WorldMap
const FACTORY_FILL: Record<string, string> = {
  FAC_A: '#34d399',
  FAC_B: '#38bdf8',
  FAC_C: '#a78bfa',
  FAC_D: '#fbbf24',
  FAC_E: '#fb7185',
};

interface MetricsChartProps {
  bom: BomLine[];
}

export default function MetricsChart({ bom }: MetricsChartProps) {
  const chartData = bom
    .slice()
    .sort((a, b) => b.totalCost - a.totalCost)
    .map((line) => ({
      label:
        line.categoryLabel.length > 22
          ? line.categoryLabel.slice(0, 20) + '…'
          : line.categoryLabel,
      fullLabel: line.categoryLabel,
      factory: line.factoryName.split(',')[0],
      factoryId: line.factoryId,
      totalCost: line.totalCost,
      qty: line.quantity,
      carbon: line.totalCarbon,
    }));

  const chartHeight = Math.max(chartData.length * 36 + 24, 200);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Cost Distribution by Category
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Total cost per BOM line · color = sourcing factory
        </p>
      </CardHeader>
      <CardContent className="pb-4 pr-4">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) =>
                v >= 1_000_000
                  ? `$${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1_000
                    ? `$${(v / 1_000).toFixed(0)}k`
                    : `$${v}`
              }
              tick={{ fill: 'oklch(0.6 0 0)', fontSize: 10 }}
              axisLine={{ stroke: 'oklch(0.3 0 0)' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ fill: 'oklch(0.65 0 0)', fontSize: 11, fontFamily: 'sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'oklch(1 0 0 / 4%)' }}
              contentStyle={{
                background: 'oklch(0.18 0 0)',
                border: '1px solid oklch(0.28 0 0)',
                borderRadius: '6px',
                color: 'oklch(0.9 0 0)',
                fontSize: 12,
              }}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload as (typeof chartData)[0] | undefined;
                return item ? `${item.fullLabel} · ${item.factory}` : label;
              }}
              formatter={(value, name) => {
                if (name === 'totalCost')
                  return [
                    `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    'Total Cost',
                  ];
                return [value, name];
              }}
            />
            <Bar dataKey="totalCost" barSize={20} radius={[0, 3, 3, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={FACTORY_FILL[entry.factoryId] ?? '#334155'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
