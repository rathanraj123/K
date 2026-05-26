import React, { useEffect, useState, Component } from 'react';
import { scientificService } from '@/services/scientificService';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, MapPin, Activity } from 'lucide-react';

// Fix Leaflet default marker icon issue in Vite/Webpack bundlers
function fixLeafletIcons() {
  try {
    const L = require('leaflet');
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  } catch {}
}

// Error boundary to prevent the whole page from crashing if Leaflet fails
class MapErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error?: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-[450px] rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col items-center justify-center gap-4">
          <Activity className="w-10 h-10 text-slate-600" />
          <div className="text-center">
            <p className="text-sm font-bold text-slate-400">GIS Map Unavailable</p>
            <p className="text-xs text-slate-600 mt-1 max-w-xs">Map module failed to initialize. Outbreak data is still available in list view.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function OutbreakMapInner() {
  const [heatmaps, setHeatmaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Dynamically import react-leaflet so it only loads client-side
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);

  useEffect(() => {
    // Fix icons before loading map
    fixLeafletIcons();

    // Dynamically import to avoid SSR issues
    Promise.all([
      import('react-leaflet'),
    ]).then(([rl]) => {
      setLeafletComponents(rl);
    }).catch(console.error);

    // Fetch data
    scientificService.getOutbreakHeatmaps()
      .then(res => setHeatmaps(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const center: [number, number] = [21.0, 78.0];

  if (loading || !LeafletComponents) {
    return (
      <div className="w-full h-[450px] rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Initializing GIS Engine...</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Popup } = LeafletComponents;

  return (
    <div className="relative w-full h-[450px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <div className="absolute top-4 left-4 z-[400] bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2 pointer-events-none">
        <MapPin className="w-4 h-4 text-rose-500" />
        <span className="text-xs font-bold text-white tracking-widest uppercase">Live GIS Outbreak Intelligence</span>
        <span className="relative flex h-2 w-2 ml-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>
      </div>

      <MapContainer
        center={center}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {heatmaps.map((point, idx) => (
          <CircleMarker
            key={idx}
            center={[point.lat, point.lon]}
            radius={Math.min(point.radius || 15, 40)}
            pathOptions={{
              color: point.intensity > 0.8 ? '#ef4444' : point.intensity > 0.5 ? '#f59e0b' : '#3b82f6',
              fillColor: point.intensity > 0.8 ? '#ef4444' : point.intensity > 0.5 ? '#f59e0b' : '#3b82f6',
              fillOpacity: 0.35,
              weight: 1.5,
            }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <strong style={{ fontSize: 13 }}>{point.disease}</strong>
                </div>
                <p style={{ fontSize: 11, margin: 0, color: '#64748b' }}>
                  Intensity: <strong style={{ color: '#0f172a' }}>{(point.intensity * 100).toFixed(0)}%</strong>
                </p>
                <p style={{ fontSize: 10, margin: '4px 0 0', fontFamily: 'monospace', color: '#94a3b8' }}>
                  {point.lat.toFixed(3)}°N, {point.lon.toFixed(3)}°E
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[400] bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 space-y-1.5">
        {[
          { color: '#ef4444', label: 'Critical (>80%)' },
          { color: '#f59e0b', label: 'High (50-80%)' },
          { color: '#3b82f6', label: 'Moderate (<50%)' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: color, opacity: 0.7 }} />
            <span className="text-[10px] text-slate-300 font-mono">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OutbreakMap() {
  return (
    <MapErrorBoundary>
      <OutbreakMapInner />
    </MapErrorBoundary>
  );
}
