import DashboardGrid from './components/DashboardGrid';

// Force runtime rendering so process.env.GOOGLE_MAPS_API_KEY is read at
// request time, not baked-in as an empty string at build time.
export const dynamic = 'force-dynamic';

export default function Home() {
  // Read at runtime on the server — no NEXT_PUBLIC_ prefix needed.
  // Passed as a prop so it is never baked into the client bundle.
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
  return <DashboardGrid googleMapsApiKey={googleMapsApiKey} />;
}

