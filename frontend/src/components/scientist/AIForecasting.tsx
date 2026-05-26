import { motion } from 'framer-motion';
import { BrainCircuit, Target, TrendingUp } from 'lucide-react';

const forecasts = [
  { region: 'Northern Belt', prediction: 'Fungal Spore Proliferation', timeframe: 'Next 48h', confidence: 92, status: 'critical' },
  { region: 'Eastern Ghats', prediction: 'Bacterial Spread Stabilization', timeframe: 'Next 5 Days', confidence: 85, status: 'stable' },
  { region: 'Central Plateau', prediction: 'Pest Migration Alert', timeframe: 'Next 7 Days', confidence: 78, status: 'warning' },
];

export function AIForecasting() {
  return (
    <div className="bg-black/40 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-500" /> AI Forecasting
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Deep Learning Predictive Models</p>
        </div>
      </div>

      <div className="space-y-4">
        {forecasts.map((forecast, idx) => (
          <div key={idx} className="relative pl-4 border-l-2 border-slate-800 hover:border-purple-500 transition-colors">
            <div className={`absolute -left-1.5 top-1.5 w-2.5 h-2.5 rounded-full ${
              forecast.status === 'critical' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' :
              forecast.status === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' :
              'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
            }`} />
            
            <div className="flex justify-between items-start mb-1">
              <h4 className="text-sm font-bold text-white">{forecast.prediction}</h4>
              <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 flex items-center gap-1">
                <Target className="w-3 h-3" /> {forecast.confidence}% CONF
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
              <span>{forecast.region}</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {forecast.timeframe}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
