import { Cpu, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const performanceData = [
  { epoch: 10, accuracy: 82, loss: 0.45 },
  { epoch: 20, accuracy: 88, loss: 0.32 },
  { epoch: 30, accuracy: 91, loss: 0.21 },
  { epoch: 40, accuracy: 94, loss: 0.15 },
  { epoch: 50, accuracy: 95.8, loss: 0.08 },
];

export function AIModelAnalytics() {
  return (
    <div className="bg-black/40 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-rose-500" /> Model Performance
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Inference & Training Analytics</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
          <p className="text-[10px] text-slate-500 font-mono mb-1">INFERENCE LATENCY</p>
          <p className="text-lg font-bold text-white flex items-center gap-2">
            42ms <Zap className="w-3 h-3 text-amber-500" />
          </p>
        </div>
        <div className="flex-1 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
          <p className="text-[10px] text-slate-500 font-mono mb-1">GLOBAL ACCURACY</p>
          <p className="text-lg font-bold text-rose-500">95.8%</p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="epoch" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[70, 100]} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
              itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
            />
            <Line yAxisId="left" type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#f43f5e" strokeWidth={3} dot={{ fill: '#f43f5e', strokeWidth: 0, r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
