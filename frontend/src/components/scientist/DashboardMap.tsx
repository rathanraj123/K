import React, { useEffect, useState, Component } from 'react';
import { MapPin, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
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
        <div className="absolute inset-0 w-full h-full rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center gap-3 p-4 text-center z-50">
          <Activity className="w-8 h-8 text-rose-500" />
          <p className="text-xs text-slate-500">Map unavailable</p>
          <p className="text-[10px] text-rose-400 font-mono break-all">{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface HeatmapPoint {
  id: string;
  lat: number;
  lng: number;
  severity: string;
  type: string;
  confidence?: number;
}

function getSeverityStyle(severity: string) {
  switch (severity) {
    case 'high':
      return { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.35, weight: 1.5 };
    case 'medium':
      return { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.3, weight: 1.5 };
    default:
      return { color: '#10b981', fillColor: '#10b981', fillOpacity: 0.25, weight: 1 };
  }
}

function DashboardMapInner({ data }: { data: HeatmapPoint[] }) {
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fixLeafletIcons().then(() => {
      import('react-leaflet')
        .then(rl => {
          setLeafletComponents(rl);
          setReady(true);
        })
        .catch(console.error);
    });
  }, []);

  if (!ready || !LeafletComponents) {
    return (
      <div className="absolute inset-0 w-full h-full rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center z-10">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Loading Map...</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Popup, LayersControl } = LeafletComponents;

  // Calculate center from data, default to India center
  let center: [number, number] = [20.5937, 78.9629];
  let zoom = 5;
  
  // Safe calculation just in case lat/lng are malformed
  const validData = Array.isArray(data) ? data.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng)) : [];

  if (validData.length > 0) {
    const avgLat = validData.reduce((sum, p) => sum + p.lat, 0) / validData.length;
    const avgLng = validData.reduce((sum, p) => sum + p.lng, 0) / validData.length;
    center = [avgLat, avgLng];
    zoom = validData.length === 1 ? 10 : 5;
  }

  const highCount = validData.filter(d => d.severity === 'high').length;

  return (
    <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 z-10">
      {/* Stats overlay */}
      <div className="absolute top-3 left-3 z-[400] pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/50 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <div>
            <p className="text-[9px] font-bold text-white tracking-wider uppercase leading-none">
              {validData.length} Scan{validData.length !== 1 ? 's' : ''} Mapped
            </p>
            {highCount > 0 && (
              <p className="text-[8px] text-rose-400 font-mono mt-0.5 leading-none">
                {highCount} high risk
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-[400] pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md px-2.5 py-2 rounded-lg border border-slate-700/50 space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
            <span className="text-[8px] text-slate-300 font-mono">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
            <span className="text-[8px] text-slate-300 font-mono">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            <span className="text-[8px] text-slate-300 font-mono">Low</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Dark Map">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OSM &copy; CARTO'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Street Map">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {validData.map((point, idx) => {
          const style = getSeverityStyle(point.severity);
          return (
            <CircleMarker
              key={point.id || idx}
              center={[point.lat, point.lng]}
              radius={point.severity === 'high' ? 10 : point.severity === 'medium' ? 8 : 6}
              pathOptions={style}
            >
              <Popup>
                <div style={{ minWidth: 160 }} className="p-0.5">
                  <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-200">
                    <strong className="text-xs uppercase font-mono truncate mr-2" title={point.type || 'Unknown'}>{point.type || 'Unknown'}</strong>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${
                      point.severity === 'high' ? 'bg-rose-100 text-rose-600' : 
                      point.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {point.severity?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2 text-[10px]">
                    <span className="text-slate-500 font-mono">
                      {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                    </span>
                    {point.confidence !== undefined && (
                      <span className="text-slate-700 font-bold">
                        {(point.confidence * 100).toFixed(0)}% Conf
                      </span>
                    )}
                  </div>
                  <Link to="/history" className="block text-center w-full bg-cyan-500 text-white hover:bg-cyan-600 py-1.5 rounded text-[10px] font-bold transition-colors">
                    View Full Analysis &rarr;
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Empty state */}
      {validData.length === 0 && (
        <div className="absolute inset-0 z-[300] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">No scan locations yet</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Scans with GPS data will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardMap({ data = [] }: { data?: HeatmapPoint[] }) {
  return (
    <MapErrorBoundary>
      <DashboardMapInner data={data} />
    </MapErrorBoundary>
  );
}
