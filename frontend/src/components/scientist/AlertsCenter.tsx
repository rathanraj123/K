import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';

const mockAlerts = [
  { id: 1, type: 'critical', title: 'Fungal Outbreak Risk', desc: 'Humidity anomaly detected in Southern Region. Rice blast probability increased by 24%.' },
  { id: 2, type: 'warning', title: 'Data Drift Detected', desc: 'Classification model precision dropped by 1.2% in the latest batch evaluation.' },
  { id: 3, type: 'info', title: 'NASA EarthData Sync', desc: 'Latest precipitation indices synced successfully. 2 new datasets available.' }
];

export function AlertsCenter() {
  const [alerts, setAlerts] = useState(mockAlerts);

  if (alerts.length === 0) return null;

  return (
    <div className="bg-black/40 border border-slate-800 rounded-2xl p-4">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-rose-500" />
        Scientific Alerts
      </h3>
      <div className="space-y-3">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              className={`p-3 rounded-xl border relative overflow-hidden group ${
                alert.type === 'critical' ? 'bg-rose-500/10 border-rose-500/20' :
                alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                'bg-blue-500/10 border-blue-500/20'
              }`}
            >
              <button 
                onClick={() => setAlerts(a => a.filter(x => x.id !== alert.id))}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="flex items-start gap-2">
                {alert.type === 'critical' && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                {alert.type === 'info' && <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                <div>
                  <h4 className={`text-xs font-bold mb-0.5 ${
                    alert.type === 'critical' ? 'text-rose-400' :
                    alert.type === 'warning' ? 'text-amber-400' :
                    'text-blue-400'
                  }`}>{alert.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed pr-4">{alert.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
