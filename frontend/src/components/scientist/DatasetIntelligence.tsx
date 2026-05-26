import { Database, Image as ImageIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const datasetDistribution = [
  { class: 'Healthy', count: 12500, quality: 98 },
  { class: 'Blight', count: 8200, quality: 95 },
  { class: 'Blast', count: 6400, quality: 92 },
  { class: 'Rust', count: 4100, quality: 88 },
  { class: 'Tungro', count: 1800, quality: 82 },
];

export function DatasetIntelligence() {
  return (
    <div className="bg-black/40 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-fuchsia-500" /> Dataset Intelligence
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Class Imbalance & Quality</p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datasetDistribution} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
            <XAxis type="number" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="class" stroke="#94a3b8" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} width={60} />
            <Tooltip 
              cursor={{ fill: '#1e293b' }}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
              itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Samples">
              {datasetDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.count < 3000 ? '#f43f5e' : entry.count < 7000 ? '#f59e0b' : '#d946ef'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800">
        <h4 className="text-[10px] text-slate-500 font-mono mb-2 uppercase">Image Quality Scores</h4>
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
          {datasetDistribution.map(d => (
            <div key={d.class} className="bg-slate-900 border border-slate-800 rounded-lg p-2 min-w-[80px] shrink-0">
              <div className="flex items-center gap-1 mb-1">
                <ImageIcon className="w-3 h-3 text-slate-400" />
                <span className="text-[9px] text-slate-400 font-bold uppercase truncate">{d.class}</span>
              </div>
              <p className={`text-sm font-black ${d.quality < 85 ? 'text-rose-500' : 'text-fuchsia-500'}`}>{d.quality}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
