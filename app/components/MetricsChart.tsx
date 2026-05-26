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

const TOP_N = 15;

interface MetricsChartProps {
  breakdown: FactoryBreakdown[];
}

export default function MetricsChart({ breakdown }: MetricsChartProps) {
  const visible = breakdown.slice(0, TOP_N);
  const chartData = visible.map((b, i) => ({
    label: b.itemName.length > 30 ? b.itemName.slice(0, 28) + '…' : b.itemName,
    fullName: b.itemName,
    factory: b.factoryName.split(',')[0],
    score: Math.round(b.compositeScore * 100),
    cost: b.totalCostPerUnit,
    carbon: b.carbonScore,
    isWinner: i === 0,
  }));

  const chartHeight = Math.max(visible.length * 32 + 24, 200);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {breakdown.length} Configurations Evaluated
          {breakdown.length > TOP_N && (
            <span className="normal-case font-normal ml-1">· Top {TOP_N} shown</span>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Composite score = weighted cost + carbon + freight · lower is better · green bar = winner
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
              domain={[0, 100]}
              tick={{ fill: 'oklch(0.6 0 0)', fontSize: 10 }}
              axisLine={{ stroke: 'oklch(0.3 0 0)' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={190}
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
                const item = payload?.[0]?.payload as typeof chartData[0] | undefined;
                return item ? `${item.fullName} · ${item.factory}` : label;
              }}
              formatter={(value, name) => {
                if (name === 'score') return [`${value}%`, 'Composite Score'];
                if (name === 'cost') return [`$${value}`, 'Cost/unit'];
                if (name === 'carbon') return [value, 'Carbon Score'];
                return [value, name];
              }}
            />
            <Bar dataKey="score" barSize={18} radius={[0, 3, 3, 0]}>
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
