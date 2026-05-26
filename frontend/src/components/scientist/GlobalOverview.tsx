import { Globe, Map, ShieldCheck, ThermometerSun } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

const vulnerabilityData = [
  { subject: 'Fungal Risk', A: 85, fullMark: 100 },
  { subject: 'Water Stress', A: 45, fullMark: 100 },
  { subject: 'Pest Migration', A: 60, fullMark: 100 },
  { subject: 'Soil Degradation', A: 30, fullMark: 100 },
  { subject: 'Climate Anomaly', A: 75, fullMark: 100 },
  { subject: 'Crop Weakness', A: 50, fullMark: 100 },
];

export function GlobalOverview() {
  return (
    <div className="bg-black/40 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" /> Global Vulnerability
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Multi-vector Risk Assessment</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-500" />
          <div>
            <p className="text-[10px] text-slate-500 font-mono">HEALTH INDEX</p>
            <p className="text-xl font-bold text-white">78/100</p>
          </div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <ThermometerSun className="w-8 h-8 text-rose-500" />
          <div>
            <p className="text-[10px] text-slate-500 font-mono">CLIMATE STRESS</p>
            <p className="text-xl font-bold text-white">HIGH</p>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={vulnerabilityData}>
            <PolarGrid stroke="#1e293b" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#334155', fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
              itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
            />
            <Radar name="Risk Factor" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
