'use client';

import { useEffect } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import type { Factory } from '@/app/data/syntheticCatalog';

interface WorldMapProps {
  factories: Factory[];
  winningFactoryId: string;
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

// ── Route polyline ────────────────────────────────────────────────────────────
interface RoutePolylineProps {
  from: google.maps.LatLngLiteral;
  to: google.maps.LatLngLiteral;
  isWinner: boolean;
}

function RoutePolyline({ from, to, isWinner }: RoutePolylineProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const line = new google.maps.Polyline({
      path: [from, to],
      geodesic: true,
      strokeColor: isWinner ? '#34d399' : '#334155',
      strokeOpacity: isWinner ? 0.9 : 0.4,
      strokeWeight: isWinner ? 2.5 : 1.5,
    });
    line.setMap(map);
    return () => line.setMap(null);
  }, [map, from.lat, from.lng, to.lat, to.lng, isWinner]);

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
function MapContent({ factories, winningFactoryId, targetCity }: WorldMapProps) {
  return (
    <>
      {/* Non-winning routes first so winning route renders on top */}
      {factories
        .filter((f) => f.id !== winningFactoryId)
        .map((f) => (
          <RoutePolyline
            key={`route-${f.id}`}
            from={{ lat: f.lat, lng: f.lng }}
            to={{ lat: targetCity.lat, lng: targetCity.lng }}
            isWinner={false}
          />
        ))}
      {factories
        .filter((f) => f.id === winningFactoryId)
        .map((f) => (
          <RoutePolyline
            key={`route-${f.id}`}
            from={{ lat: f.lat, lng: f.lng }}
            to={{ lat: targetCity.lat, lng: targetCity.lng }}
            isWinner={true}
          />
        ))}

      {/* Factory markers */}
      {factories.map((f) => {
        const isWinner = f.id === winningFactoryId;
        return (
          <DotMarker
            key={`marker-${f.id}`}
            position={{ lat: f.lat, lng: f.lng }}
            label={f.name}
            fillColor={isWinner ? '#34d399' : '#38bdf8'}
            strokeColor={isWinner ? '#052e16' : '#0c4a6e'}
            scale={isWinner ? 9 : 7}
          />
        );
      })}

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
export default function WorldMap({ factories, winningFactoryId, targetCity }: WorldMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div
        className="w-full rounded-lg border border-border flex items-center justify-center"
        style={{ height: 300, background: '#0a1628' }}
        aria-label="Supply chain route map"
      >
        <p className="text-sm text-muted-foreground">
          Set{' '}
          <code className="font-mono text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
          {' '}to enable map
        </p>
      </div>
    );
  }

  const allLats = [...factories.map((f) => f.lat), targetCity.lat];
  const allLngs = [...factories.map((f) => f.lng), targetCity.lng];
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
            factories={factories}
            winningFactoryId={winningFactoryId}
            targetCity={targetCity}
          />
        </Map>
      </div>
    </APIProvider>
  );
}
