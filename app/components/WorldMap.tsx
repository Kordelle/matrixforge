'use client';

import type { Factory } from '@/app/data/syntheticCatalog';

interface WorldMapProps {
  factories: Factory[];
  winningFactoryId: string;
  targetCity: { name: string; lat: number; lng: number };
}

const W = 800;
const H = 400;

function proj(lng: number, lat: number) {
  return {
    x: ((lng + 180) / 360) * W,
    y: ((90 - lat) / 180) * H,
  };
}

// Approximate bounding boxes [minLng, maxLat, maxLng, minLat]
const LAND_MASSES: [number, number, number, number][] = [
  [-168, 72, -52, 18],  // North America
  [-82, 14, -34, -56],  // South America
  [-10, 72, 40, 35],    // Europe
  [-20, 38, 55, -35],   // Africa
  [25, 78, 180, 0],     // Asia
  [110, -10, 155, -45], // Australia
  [-55, 84, -20, 60],   // Greenland
];

const GRID_LATS = [-60, -30, 0, 30, 60];
const GRID_LNGS = [-120, -60, 0, 60, 120];

export default function WorldMap({ factories, winningFactoryId, targetCity }: WorldMapProps) {
  const targetPt = proj(targetCity.lng, targetCity.lat);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-lg border border-border"
      style={{ background: 'oklch(0.1 0.008 250)', maxHeight: 280 }}
      aria-label="Supply chain route map"
    >
      {/* Grid lines */}
      {GRID_LATS.map((lat) => {
        const y = ((90 - lat) / 180) * H;
        return (
          <line
            key={`lat-${lat}`}
            x1={0}
            y1={y}
            x2={W}
            y2={y}
            stroke="oklch(0.22 0 0)"
            strokeWidth={0.5}
          />
        );
      })}
      {GRID_LNGS.map((lng) => {
        const x = ((lng + 180) / 360) * W;
        return (
          <line
            key={`lng-${lng}`}
            x1={x}
            y1={0}
            x2={x}
            y2={H}
            stroke="oklch(0.22 0 0)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Land masses */}
      {LAND_MASSES.map(([lng1, lat1, lng2, lat2], i) => {
        const { x, y } = proj(lng1, lat1);
        const { x: x2, y: y2 } = proj(lng2, lat2);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={x2 - x}
            height={y2 - y}
            fill="oklch(0.22 0.008 250)"
            rx={3}
          />
        );
      })}

      {/* Route lines */}
      {factories.map((f) => {
        const from = proj(f.lng, f.lat);
        const isWinner = f.id === winningFactoryId;
        return isWinner ? (
          <line
            key={`line-${f.id}`}
            x1={from.x}
            y1={from.y}
            x2={targetPt.x}
            y2={targetPt.y}
            stroke="#34d399"
            strokeWidth={2}
            strokeDasharray="7 3"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-40"
              dur="1.1s"
              repeatCount="indefinite"
            />
          </line>
        ) : (
          <line
            key={`line-${f.id}`}
            x1={from.x}
            y1={from.y}
            x2={targetPt.x}
            y2={targetPt.y}
            stroke="oklch(0.45 0 0)"
            strokeWidth={1}
            strokeDasharray="3 5"
            opacity={0.45}
          />
        );
      })}

      {/* Factory markers */}
      {factories.map((f) => {
        const { x, y } = proj(f.lng, f.lat);
        const isWinner = f.id === winningFactoryId;
        return (
          <g key={f.id}>
            {isWinner && (
              <circle cx={x} cy={y} r={10} fill="#34d399" opacity={0.12}>
                <animate
                  attributeName="r"
                  values="8;15;8"
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.15;0.04;0.15"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <circle
              cx={x}
              cy={y}
              r={5}
              fill={isWinner ? '#34d399' : '#38bdf8'}
              stroke={isWinner ? '#052e16' : '#0c4a6e'}
              strokeWidth={1.5}
            />
            <text
              x={x + 7}
              y={y + 4}
              fontSize={9}
              fill={isWinner ? '#34d399' : '#94a3b8'}
              fontFamily="ui-monospace, monospace"
            >
              {f.name}
            </text>
          </g>
        );
      })}

      {/* Target city */}
      <circle
        cx={targetPt.x}
        cy={targetPt.y}
        r={6}
        fill="#fbbf24"
        stroke="#451a03"
        strokeWidth={1.5}
      />
      <text
        x={targetPt.x + 8}
        y={targetPt.y + 4}
        fontSize={9}
        fill="#fbbf24"
        fontFamily="ui-monospace, monospace"
      >
        {targetCity.name}
      </text>
    </svg>
  );
}
