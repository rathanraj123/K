import { MessageSquare, Users, Edit3 } from 'lucide-react';

const discussions = [
  { user: 'Dr. Sarah', role: 'Pathologist', message: 'The southern clusters look anomalous. Are we sure it\'s blast?', time: '2m ago' },
  { user: 'Dr. Chen', role: 'Climatologist', message: 'I verified the Open-Meteo sync. The humidity spike matches the spread vector.', time: '14m ago' },
  { user: 'System', role: 'Automated', message: 'Experiment #42 (Fungicide Efficacy) completed. Results logged.', time: '1h ago' },
];

export function CollaborationWorkspace() {
  return (
    <div className="bg-black/40 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" /> Research Comms
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Cross-team Collaboration</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 mb-4 overflow-y-auto custom-scrollbar pr-2">
        {discussions.map((msg, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-indigo-400">{msg.user[0]}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-white">{msg.user}</span>
                <span className="text-[9px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-800">{msg.role}</span>
                <span className="text-[9px] text-slate-500 ml-auto">{msg.time}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{msg.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-auto">
        <input 
          type="text" 
          placeholder="Share an insight or observation..." 
          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2 pl-3 pr-10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button className="absolute right-2 top-2 p-1 text-slate-500 hover:text-indigo-400 transition-colors">
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
