import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { scientificService } from '@/services/scientificService';
import { Skeleton } from '@/components/ui/skeleton';
import { CloudRain, Thermometer, Wind, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function ClimateAnalyticsPanel() {
  const [climate, setClimate] = useState<any>(null);
  const [nasa, setNasa] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, n, r] = await Promise.all([
          scientificService.getHistoricalClimate(),
          scientificService.getNasaAnomalies(),
          scientificService.getClimateRisk()
        ]);
        
        // Transform Open-Meteo data for Recharts
        const formattedData = c.time.map((t: string, i: number) => ({
          date: t.slice(5), // MM-DD
          temp: c.temperature_max[i],
          precip: c.precipitation[i]
        }));
        
        setClimate(formattedData);
        setNasa(n);
        setRisk(r);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><Skeleton className="h-[300px] md:col-span-2 rounded-2xl bg-white/5" /><Skeleton className="h-[300px] rounded-2xl bg-white/5" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <CloudRain className="w-32 h-32 text-blue-500" />
        </div>
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Thermometer className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Climate & Environmental Intelligence</h3>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">14-Day Temperature & Precipitation Correlation</p>
          </div>
        </div>
        
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={climate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(239, 68, 68)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="rgb(239, 68, 68)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="precipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(59, 130, 246)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              <Area yAxisId="left" type="monotone" dataKey="temp" stroke="rgb(239, 68, 68)" fill="url(#tempGrad)" strokeWidth={2} name="Max Temp (°C)" />
              <Area yAxisId="right" type="step" dataKey="precip" stroke="rgb(59, 130, 246)" fill="url(#precipGrad)" strokeWidth={2} name="Precipitation (mm)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="flex flex-col gap-6">
        <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl hover:border-amber-500/30 transition-all duration-500">
           <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /> Predictive Forecasting</h4>
           <div className="space-y-4">
              <div>
                 <p className="text-[10px] text-slate-500 font-mono uppercase">AI Vulnerability Index</p>
                 <p className="text-2xl font-black text-amber-400">{nasa?.climate_vulnerability || 'High'}</p>
              </div>
              <div className="pt-4 border-t border-white/10">
                 <p className="text-[10px] text-slate-500 font-mono uppercase">Disease Risk Correlation</p>
                 <p className="text-sm font-semibold text-white mt-1 leading-snug">{risk?.correlation_insight}</p>
              </div>
           </div>
        </div>
        
        <div className="bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-6 shadow-2xl flex-1">
           <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-4 flex items-center gap-2"><Wind className="w-4 h-4" /> NASA EarthData Anomalies</h4>
           <div className="space-y-3">
             {nasa?.anomalies?.map((a: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
                   <div>
                     <p className="text-xs font-bold text-slate-200">{a.type}</p>
                     <p className="text-[10px] text-slate-400 font-mono">{a.status}</p>
                   </div>
                   <span className="text-xs font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                     {a.severity.toFixed(2)}
                   </span>
                </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
