'use client';

import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Line,
  Marker,
  Sphere,
} from 'react-simple-maps';

import type { Factory } from '@/app/data/syntheticCatalog';

const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface WorldMapProps {
  factories: Factory[];
  winningFactoryId: string;
  targetCity: { name: string; lat: number; lng: number };
}

export default function WorldMap({ factories, winningFactoryId, targetCity }: WorldMapProps) {
  return (
    <div
      className="w-full rounded-lg border border-border overflow-hidden"
      style={{ maxHeight: 300, background: '#0a1628' }}
      aria-label="Supply chain route map"
    >
      <ComposableMap
        projection="geoEquirectangular"
        projectionConfig={{ scale: 153, center: [0, 10] }}
        style={{ width: '100%', height: '100%', maxHeight: 300 }}
      >
        {/* Ocean */}
        <Sphere id="rsm-sphere" stroke="#1e3a5f" strokeWidth={0.5} fill="#0a1628" />

        {/* Lat/lng grid */}
        <Graticule stroke="#0f2942" strokeWidth={0.4} />

        {/* Country fills */}
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#1a2e4a"
                stroke="#2d4a6e"
                strokeWidth={0.4}
                style={{
                  default: { outline: 'none' },
                  hover:   { outline: 'none' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        {/* Route lines — non-winners first so winner renders on top */}
        {factories
          .filter((f) => f.id !== winningFactoryId)
          .map((f) => (
            <Line
              key={`line-${f.id}`}
              from={[f.lng, f.lat]}
              to={[targetCity.lng, targetCity.lat]}
              stroke="#334155"
              strokeWidth={1}
              strokeDasharray="4 5"
              strokeLinecap="round"
              opacity={0.5}
            />
          ))}

        {/* Winning route — animated dashed */}
        {factories
          .filter((f) => f.id === winningFactoryId)
          .map((f) => (
            <Line
              key={`line-${f.id}`}
              from={[f.lng, f.lat]}
              to={[targetCity.lng, targetCity.lat]}
              stroke="#34d399"
              strokeWidth={2}
              strokeDasharray="8 4"
              strokeLinecap="round"
              className="route-winner"
            />
          ))}

        {/* Factory markers */}
        {factories.map((f) => {
          const isWinner = f.id === winningFactoryId;
          return (
            <Marker key={f.id} coordinates={[f.lng, f.lat]}>
              {isWinner && (
                <circle r={10} fill="#34d399" opacity={0.15} className="factory-pulse" />
              )}
              <circle
                r={5}
                fill={isWinner ? '#34d399' : '#38bdf8'}
                stroke={isWinner ? '#052e16' : '#0c4a6e'}
                strokeWidth={1.5}
              />
              <text
                x={8}
                y={4}
                fontSize={8}
                fill={isWinner ? '#34d399' : '#94a3b8'}
                style={{ fontFamily: 'ui-monospace, monospace', pointerEvents: 'none' }}
              >
                {f.name}
              </text>
            </Marker>
          );
        })}

        {/* Target city */}
        <Marker coordinates={[targetCity.lng, targetCity.lat]}>
          <circle r={6} fill="#f59e0b" stroke="#451a03" strokeWidth={1.5} />
          <text
            x={9}
            y={4}
            fontSize={8}
            fill="#fbbf24"
            style={{ fontFamily: 'ui-monospace, monospace', pointerEvents: 'none' }}
          >
            {targetCity.name}
          </text>
        </Marker>
      </ComposableMap>
    </div>
  );
}
