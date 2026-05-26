import { motion } from 'framer-motion';
import { Activity, Globe, Shield, Wifi, Zap, LogOut } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { safeDate } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function IntelligenceHeader() {
  const userName = useAppStore(s => s.userName);
  const logout = useAppStore(s => s.logout);
  const [time, setTime] = useState(safeDate());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(safeDate()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative border-b border-white/5 bg-slate-950/80 backdrop-blur-xl pt-24 pb-6 px-4 md:px-8 z-40 overflow-hidden">
      {/* Sci-Fi Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
      
      {/* Top Left Status */}
      <div className="absolute top-20 left-8 flex items-center gap-4 text-[10px] font-mono tracking-widest text-slate-500 uppercase">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
          Global Sync Active
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
          <Globe className="w-3 h-3 text-emerald-500" /> System Secure
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-2 flex items-center gap-3">
            <Shield className="w-10 h-10 text-cyan-500" />
            Agri<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Intelligence</span>
          </h1>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-xs uppercase tracking-widest">
            <p className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-rose-500" />
              Welcome, Dr. {userName} | {time.toISOString()}
            </p>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded hover:bg-rose-500/20 transition-colors"
            >
              <LogOut className="w-3 h-3" /> Disconnect
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-4">
          {/* Status Metric 1 */}
          <div className="bg-black/60 border border-slate-800 rounded-lg p-3 flex items-center gap-3 w-40">
            <div className="p-2 bg-blue-500/10 rounded-md">
              <Wifi className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">API Status</p>
              <p className="text-sm text-white font-bold">NOMINAL</p>
            </div>
          </div>

          {/* Status Metric 2 */}
          <div className="bg-black/60 border border-slate-800 rounded-lg p-3 flex items-center gap-3 w-40">
            <div className="p-2 bg-rose-500/10 rounded-md">
              <Zap className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Live Outbreaks</p>
              <p className="text-sm text-white font-bold flex items-center gap-1">
                24 <span className="text-rose-500 text-[10px]">↑ 12%</span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
