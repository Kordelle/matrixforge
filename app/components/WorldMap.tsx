'use client';

import { useEffect } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import type { ActiveFactory } from '@/lib/types';

interface WorldMapProps {
  apiKey: string;
  activeFactories: ActiveFactory[];
  targetCity: { name: string; lat: number; lng: number };
}

const DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a2e4a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a1628' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1e3a5f' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2d4a6e' }] },
];

// Factory color palette — one color per FAC slot
const FACTORY_STROKE: Record<string, string> = {
  FAC_A: '#34d399', // emerald
  FAC_B: '#38bdf8', // sky
  FAC_C: '#a78bfa', // violet
  FAC_D: '#fbbf24', // amber
  FAC_E: '#fb7185', // rose
};

const FACTORY_FILL: Record<string, string> = {
  FAC_A: '#052e16',
  FAC_B: '#0c4a6e',
  FAC_C: '#2e1065',
  FAC_D: '#451a03',
  FAC_E: '#4c0519',
};

// ── Route polyline ────────────────────────────────────────────────────────────
interface RoutePolylineProps {
  from: google.maps.LatLngLiteral;
  to: google.maps.LatLngLiteral;
  color: string;
}

function RoutePolyline({ from, to, color }: RoutePolylineProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const line = new google.maps.Polyline({
      path: [from, to],
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 0.85,
      strokeWeight: 2.5,
    });
    line.setMap(map);
    return () => line.setMap(null);
  }, [map, from.lat, from.lng, to.lat, to.lng, color]);

  return null;
}

// ── Dot marker ────────────────────────────────────────────────────────────────
interface DotMarkerProps {
  position: google.maps.LatLngLiteral;
  label: string;
  fillColor: string;
  strokeColor: string;
  scale?: number;
}

function DotMarker({ position, label, fillColor, strokeColor, scale = 7 }: DotMarkerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const marker = new google.maps.Marker({
      position,
      map,
      title: label,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale,
        fillColor,
        fillOpacity: 1,
        strokeColor,
        strokeWeight: 2,
      },
    });
    return () => marker.setMap(null);
  }, [map, position.lat, position.lng, fillColor, strokeColor, scale, label]);

  return null;
}

// ── Inner content (must be a child of <Map>) ──────────────────────────────────
type MapContentProps = Omit<WorldMapProps, 'apiKey'>;

function MapContent({ activeFactories, targetCity }: MapContentProps) {
  return (
    <>
      {/* One colored route per active factory */}
      {activeFactories.map((f) => (
        <RoutePolyline
          key={`route-${f.id}`}
          from={{ lat: f.lat, lng: f.lng }}
          to={{ lat: targetCity.lat, lng: targetCity.lng }}
          color={FACTORY_STROKE[f.id] ?? '#64748b'}
        />
      ))}

      {/* Factory markers */}
      {activeFactories.map((f) => (
        <DotMarker
          key={`marker-${f.id}`}
          position={{ lat: f.lat, lng: f.lng }}
          label={f.name}
          fillColor={FACTORY_STROKE[f.id] ?? '#94a3b8'}
          strokeColor={FACTORY_FILL[f.id] ?? '#0a1628'}
          scale={9}
        />
      ))}

      {/* Target city */}
      <DotMarker
        position={{ lat: targetCity.lat, lng: targetCity.lng }}
        label={targetCity.name}
        fillColor="#f59e0b"
        strokeColor="#451a03"
        scale={9}
      />
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export default function WorldMap({ apiKey, activeFactories, targetCity }: WorldMapProps) {
  if (!apiKey) {
    return (
      <div
        className="w-full rounded-lg border border-border flex items-center justify-center"
        style={{ height: 300, background: '#0a1628' }}
        aria-label="Supply chain route map"
      >
        <p className="text-sm text-muted-foreground">
          Set{' '}
          <code className="font-mono text-xs">GOOGLE_MAPS_API_KEY</code>
          {' '}in your environment to enable map
        </p>
      </div>
    );
  }

  const allLats = [...activeFactories.map((f) => f.lat), targetCity.lat];
  const allLngs = [...activeFactories.map((f) => f.lng), targetCity.lng];
  const center: google.maps.LatLngLiteral = {
    lat: (Math.min(...allLats) + Math.max(...allLats)) / 2,
    lng: (Math.min(...allLngs) + Math.max(...allLngs)) / 2,
  };

  return (
    <APIProvider apiKey={apiKey}>
      <div
        className="w-full rounded-lg border border-border overflow-hidden"
        style={{ height: 300 }}
        aria-label="Supply chain route map"
      >
        <Map
          defaultCenter={center}
          defaultZoom={2}
          disableDefaultUI
          gestureHandling="cooperative"
          styles={DARK_STYLES}
        >
          <MapContent
            activeFactories={activeFactories}
            targetCity={targetCity}
          />
        </Map>
      </div>
    </APIProvider>
  );
}
