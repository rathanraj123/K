import { Activity, Radio, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

import { useAppStore } from '@/store/useAppStore';

export function RealTimeMonitor() {
  const scanHistory = useAppStore(s => s.scanHistory);
  const [stream, setStream] = useState<any[]>([]);

  useEffect(() => {
    // Initial load
    const realEvents = scanHistory.slice(0, 5).map(s => ({
      id: s.id || Math.random(),
      type: 'scan',
      region: 'Platform Scan',
      result: s.diseaseName,
      confidence: s.confidence ? Math.round(s.confidence * 100) : 95
    }));
    
    // Fill if empty
    if (realEvents.length === 0) {
      realEvents.push({ id: 1, type: 'alert', region: 'Global Monitor', result: 'System Initialization', confidence: 100 });
    }
    setStream(realEvents);

    // Start live simulation interval based on data distribution
    const interval = setInterval(() => {
      setStream(prev => {
        // pick a random disease from history or fallback
        const basePool = scanHistory.length > 0 ? scanHistory : [{ diseaseName: 'Healthy', confidence: 0.99 }];
        const randomBase = basePool[Math.floor(Math.random() * basePool.length)];
        
        const newEvent = {
          id: Date.now(),
          type: Math.random() > 0.85 ? 'alert' : 'scan',
          region: ['Central Zone', 'Coastal Belt', 'Highlands', 'Valley', 'Platform Upload'][Math.floor(Math.random() * 5)],
          result: randomBase.diseaseName,
          confidence: randomBase.confidence ? Math.round(randomBase.confidence * 100) - Math.floor(Math.random()*5) : 95
        };
        return [newEvent, ...prev].slice(0, 6);
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [scanHistory]);

  return (
    <div className="bg-black/40 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-500 animate-pulse" /> Live Stream
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Global Scan Activity</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950 z-10 pointer-events-none" />
        <div className="space-y-3 pb-8">
          <AnimatePresence>
            {stream.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-center gap-3"
              >
                <div className={`p-2 rounded-lg shrink-0 ${event.type === 'alert' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {event.type === 'alert' ? <Activity className="w-4 h-4" /> : <Scan className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-bold text-white truncate">{event.result}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{event.confidence}% CONF</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{event.region}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
