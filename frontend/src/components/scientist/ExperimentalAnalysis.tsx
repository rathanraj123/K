import { Beaker, FlaskConical, TrendingDown, TrendingUp } from 'lucide-react';

const experiments = [
  { id: 'T-802', type: 'Prophylactic', target: 'Rice Blast', efficacy: '+82%', status: 'active', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'T-805', type: 'Chemical', target: 'Bacterial Blight', efficacy: '-14%', status: 'failed', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { id: 'T-811', type: 'Biological', target: 'Brown Spot', efficacy: 'Pending', status: 'running', color: 'text-amber-500', bg: 'bg-amber-500/10' },
];

export function ExperimentalAnalysis() {
  return (
    <div className="bg-black/40 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <Beaker className="w-5 h-5 text-fuchsia-500" /> Experimental Trials
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Treatment Efficacy Analysis</p>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {experiments.map(exp => (
          <div key={exp.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/30 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${exp.bg}`}>
              <FlaskConical className={`w-4 h-4 ${exp.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-white truncate">{exp.target}</span>
                <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                  exp.efficacy.startsWith('+') ? 'text-emerald-500' : 
                  exp.efficacy.startsWith('-') ? 'text-rose-500' : 'text-amber-500'
                }`}>
                  {exp.efficacy.startsWith('+') && <TrendingUp className="w-3 h-3" />}
                  {exp.efficacy.startsWith('-') && <TrendingDown className="w-3 h-3" />}
                  {exp.efficacy}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                <span>{exp.id}</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span>{exp.type}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
