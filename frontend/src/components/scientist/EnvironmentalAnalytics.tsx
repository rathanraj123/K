import { Network } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';

const correlationData = [
  { temp: 22, humidity: 85, outbreak_severity: 8 },
  { temp: 24, humidity: 88, outbreak_severity: 15 },
  { temp: 26, humidity: 92, outbreak_severity: 45 },
  { temp: 28, humidity: 90, outbreak_severity: 60 },
  { temp: 30, humidity: 85, outbreak_severity: 40 },
  { temp: 32, humidity: 70, outbreak_severity: 20 },
  { temp: 35, humidity: 60, outbreak_severity: 5 },
];

export function EnvironmentalAnalytics() {
  return (
    <div className="bg-black/40 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-emerald-500" /> Environment Correlation
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Temp/Humidity vs Outbreak Density</p>
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" dataKey="temp" name="Temperature" unit="°C" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis type="number" dataKey="humidity" name="Humidity" unit="%" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <ZAxis type="number" dataKey="outbreak_severity" range={[50, 400]} name="Severity" />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
              itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
              labelStyle={{ display: 'none' }}
            />
            <Scatter name="Risk Clusters" data={correlationData} fill="#10b981" opacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
        <p className="text-[10px] text-emerald-400 font-mono leading-relaxed">
          <strong>AI ANALYSIS:</strong> Peak fungal outbreak severity observed at 28°C with &gt;88% relative humidity. Immediate prophylactic intervention recommended in zones matching these environmental signatures.
        </p>
      </div>
    </div>
  );
}
