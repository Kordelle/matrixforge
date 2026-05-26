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
import type { FactoryBreakdown } from '@/lib/types';

interface MetricsChartProps {
  breakdown: FactoryBreakdown[];
}

export default function MetricsChart({ breakdown }: MetricsChartProps) {
  const chartData = breakdown.map((b, i) => ({
    label: b.sku.replace('COMP-', ''),
    factory: b.factoryName.split(',')[0],
    score: Math.round(b.compositeScore * 100),
    cost: b.totalCostPerUnit,
    carbon: b.carbonScore,
    isWinner: i === 0,
  }));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Composite Score by Configuration
        </CardTitle>
        <p className="text-xs text-muted-foreground">Lower score → optimal · Winner highlighted</p>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'oklch(0.6 0 0)', fontSize: 11, fontFamily: 'monospace' }}
              axisLine={{ stroke: 'oklch(0.3 0 0)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'oklch(0.6 0 0)', fontSize: 10 }}
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
                const item = payload?.[0]?.payload as typeof chartData[0] | undefined;
                return item ? `${label} · ${item.factory}` : label;
              }}
              formatter={(value, name) => {
                if (name === 'score') return [`${value}%`, 'Composite Score'];
                if (name === 'cost') return [`$${value}`, 'Cost/unit'];
                if (name === 'carbon') return [value, 'Carbon Score'];
                return [value, name];
              }}
            />
            <Bar dataKey="score" radius={[3, 3, 0, 0]} maxBarSize={56}>
              {chartData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.isWinner ? '#34d399' : '#334155'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}