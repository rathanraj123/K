import React, { useEffect, useState } from 'react';
import { scientificService } from '@/services/scientificService';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, ShieldAlert, Cpu } from 'lucide-react';

export function ResearchMonitoringCenter() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await scientificService.getRegionalStats();
        setStats(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl h-full flex flex-col">
       <div className="flex items-center justify-between mb-6">
         <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <Activity className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Regional Agriculture Intelligence</h3>
              <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">Data.gov.in Aggregation</p>
            </div>
         </div>
         <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-full border border-white/10">
           <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
           <span className="text-[9px] font-mono font-bold text-slate-300">LIVE SYNC</span>
         </div>
       </div>

       <div className="grid grid-cols-2 gap-3 mb-4">
         <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
           <Cpu className="w-4 h-4 text-slate-500 mb-2" />
           <p className="text-[10px] text-slate-400 uppercase font-bold">Total Datasets</p>
           <p className="text-xl font-black text-white">{stats.length}</p>
         </div>
         <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
           <ShieldAlert className="w-4 h-4 text-slate-500 mb-2" />
           <p className="text-[10px] text-slate-400 uppercase font-bold">High Risk Zones</p>
           <p className="text-xl font-black text-rose-400">{stats.filter(s => s.alert_level.includes('Risk')).length}</p>
         </div>
       </div>

       <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
         {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl bg-white/5" />)
         ) : (
            stats.map((s, i) => (
               <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">{s.district}</h4>
                    <p className="text-[10px] font-mono text-slate-500">{s.crop}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${s.alert_level.includes('Risk') ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'}`}>
                      {s.alert_level}
                    </span>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">Health Idx: {s.health_index}</p>
                  </div>
               </div>
            ))
         )}
       </div>
    </div>
  );
}
