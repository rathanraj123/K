import React, { useEffect, useState, Component } from 'react';
import { scientificService } from '@/services/scientificService';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, MapPin, Activity, ShieldAlert } from 'lucide-react';

import 'leaflet/dist/leaflet.css';

async function fixLeafletIcons() {
  try {
    const L = await import('leaflet');
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  } catch (e) {
    console.error("Leaflet icon fix failed:", e);
  }
}

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
        <div className="w-full h-full min-h-[400px] rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center gap-4">
          <Activity className="w-10 h-10 text-slate-700" />
          <div className="text-center">
            <p className="text-sm font-bold text-slate-400">GIS Subsystem Offline</p>
            <p className="text-xs text-slate-600 mt-1 max-w-xs">Map module failed to initialize. Leaflet rendering error.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function GISHeatmapsInner() {
  const [heatmaps, setHeatmaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);

  useEffect(() => {
    fixLeafletIcons().then(() => {
      import('react-leaflet')
        .then(rl => setLeafletComponents(rl))
        .catch(console.error);
    });

    scientificService.getOutbreakHeatmaps()
      .then(res => setHeatmaps(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const center: [number, number] = [21.0, 78.0];

  if (loading || !LeafletComponents) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Initializing Spatial Engine...</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Popup } = LeafletComponents;

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 group">
      {/* Header Overlay */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-500" />
          <div>
            <p className="text-[10px] font-bold text-white tracking-widest uppercase leading-none">Spatial Analytics</p>
            <p className="text-[9px] text-slate-400 font-mono mt-0.5 leading-none">Global Outbreak Vector Map</p>
          </div>
        </div>
        
        <div className="bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
           <ShieldAlert className="w-3 h-3 text-rose-500 animate-pulse" />
           <span className="text-[10px] text-rose-500 font-mono font-bold">2 CRITICAL ZONES</span>
        </div>
      </div>

      <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%', minHeight: '400px' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OSM &copy; CARTO'
        />
        {heatmaps.map((point, idx) => (
          <CircleMarker
            key={idx}
            center={[point.lat, point.lon]}
            radius={Math.min(point.radius || 15, 30)}
            pathOptions={{
              color: point.intensity > 0.8 ? '#ef4444' : point.intensity > 0.5 ? '#f59e0b' : '#10b981',
              fillColor: point.intensity > 0.8 ? '#ef4444' : point.intensity > 0.5 ? '#f59e0b' : '#10b981',
              fillOpacity: 0.3,
              weight: 1.5,
            }}
          >
            <Popup className="bg-slate-900 border-slate-700">
              <div style={{ minWidth: 160 }} className="p-1">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700">
                  <strong className="text-xs text-white uppercase font-mono">{point.disease}</strong>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${point.intensity > 0.8 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {point.intensity > 0.8 ? 'CRITICAL' : 'MONITORING'}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-mono flex justify-between">
                    <span>Severity:</span> <strong className="text-white">{(point.intensity * 100).toFixed(0)}%</strong>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono flex justify-between">
                    <span>Location:</span> <strong className="text-white">{point.lat.toFixed(2)}, {point.lon.toFixed(2)}</strong>
                  </p>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export function GISHeatmaps() {
  return (
    <MapErrorBoundary>
      <GISHeatmapsInner />
    </MapErrorBoundary>
  );
}
