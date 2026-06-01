'use client';

import { Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { BomLine } from '@/lib/types';

// One color per factory slot — matches WorldMap polyline palette
const FACTORY_TEXT: Record<string, string> = {
  FAC_A: 'text-emerald-400',
  FAC_B: 'text-sky-400',
  FAC_C: 'text-violet-400',
  FAC_D: 'text-amber-400',
  FAC_E: 'text-rose-400',
};

const FACTORY_DOT: Record<string, string> = {
  FAC_A: 'bg-emerald-400',
  FAC_B: 'bg-sky-400',
  FAC_C: 'bg-violet-400',
  FAC_D: 'bg-amber-400',
  FAC_E: 'bg-rose-400',
};

interface BomTableProps {
  bom: BomLine[];
  totalProjectCost: number;
}

export default function BomTable({ bom, totalProjectCost }: BomTableProps) {
  const totalUnits = bom.reduce((s, l) => s + l.quantity, 0);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          Bill of Materials · {bom.length} categories · {totalUnits.toLocaleString()} units ·{' '}
          <span className="text-amber-400 font-semibold">{formatCurrency(totalProjectCost)}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-0 pb-2">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Category
                </th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  SKU
                </th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Source
                </th>
                <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Qty
                </th>
                <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Unit $
                </th>
                <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Total
                </th>
                <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  CO₂e
                </th>
              </tr>
            </thead>

            <tbody>
              {bom.map((line, i) => (
                <tr
                  key={line.category}
                  className={i % 2 === 0 ? 'bg-card' : 'bg-muted/10'}
                >
                  <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">
                    {line.categoryLabel}
                  </td>

                  <td className="px-4 py-2.5 font-mono text-muted-foreground hidden sm:table-cell">
                    {line.sku}
                  </td>

                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${FACTORY_DOT[line.factoryId] ?? 'bg-muted-foreground'}`}
                      />
                      <span
                        className={`${FACTORY_TEXT[line.factoryId] ?? 'text-foreground'} whitespace-nowrap`}
                      >
                        {line.factoryName.split(',')[0]}
                      </span>
                    </span>
                  </td>

                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {line.quantity.toLocaleString()}
                  </td>

                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                    {formatCurrency(line.unitCost + line.freightCostPerUnit)}
                  </td>

                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-foreground">
                    {formatCurrency(line.totalCost)}
                  </td>

                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                    {Math.round(line.totalCarbon).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Totals row */}
            <tfoot>
              <tr className="border-t border-border bg-muted/20">
                <td
                  className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
                  colSpan={3}
                >
                  Project Total
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-foreground">
                  {totalUnits.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell" />
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-amber-400">
                  {formatCurrency(totalProjectCost)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                  {Math.round(bom.reduce((s, l) => s + l.totalCarbon, 0)).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
