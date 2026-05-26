import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield, Activity, AlertTriangle, Globe, Cpu, BrainCircuit,
  ScanLine, Zap, MapPin, Bug, Leaf, Target, Radio,
  Database, Beaker, FlaskConical, TrendingUp, TrendingDown,
  CloudRain, Thermometer, Network, BookOpen, ExternalLink
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, BarChart, Bar, Cell
} from 'recharts';
import { safeDate, cn } from '@/lib/utils';
import { fetchAgricultureNews, NewsArticle } from '@/services/newsService';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: 'easeOut' },
  }),
};

// Vulnerability radar data
const vulnerabilityData = [
  { subject: 'Fungal', A: 85 }, { subject: 'Water Stress', A: 45 },
  { subject: 'Pest', A: 60 }, { subject: 'Soil', A: 30 },
  { subject: 'Climate', A: 75 }, { subject: 'Crop', A: 50 },
];

// Dataset distribution
const datasetDist = [
  { class: 'Healthy', count: 12500 }, { class: 'Blight', count: 8200 },
  { class: 'Blast', count: 6400 }, { class: 'Rust', count: 4100 },
  { class: 'Tungro', count: 1800 },
];

// Model performance
const modelPerf = [
  { epoch: 10, accuracy: 82 }, { epoch: 20, accuracy: 88 },
  { epoch: 30, accuracy: 91 }, { epoch: 40, accuracy: 94 }, { epoch: 50, accuracy: 95.8 },
];

// AI Forecasts
const forecasts = [
  { region: 'Northern Belt', prediction: 'Fungal Spore Proliferation', timeframe: '48h', confidence: 92, status: 'critical' },
  { region: 'Eastern Ghats', prediction: 'Bacterial Spread Stabilization', timeframe: '5 Days', confidence: 85, status: 'stable' },
  { region: 'Central Plateau', prediction: 'Pest Migration Alert', timeframe: '7 Days', confidence: 78, status: 'warning' },
];

export default function ScientistDashboardView() {
  const userName = useAppStore(s => s.userName);
  const scanHistory = useAppStore(s => s.scanHistory);
  const token = useAppStore(s => s.token);
  const fetchHistory = useAppStore(s => s.fetchHistory);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveStream, setLiveStream] = useState<any[]>([]);

  const hour = safeDate().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    if (token) {
      fetchHistory();
      fetchAgricultureNews().then(setNews).finally(() => setIsLoading(false));
    }
  }, [fetchHistory, token]);

  // Live stream simulation from scan history
  useEffect(() => {
    const base = scanHistory.slice(0, 5).map(s => ({
      id: s.id, result: s.diseaseName, confidence: Math.round(s.confidence), region: 'Platform Scan'
    }));
    if (base.length === 0) base.push({ id: '1', result: 'System Init', confidence: 100, region: 'Global' });
    setLiveStream(base);

    const interval = setInterval(() => {
      setLiveStream(prev => {
        const pool = scanHistory.length > 0 ? scanHistory : [{ diseaseName: 'Healthy', confidence: 99 }];
        const r = pool[Math.floor(Math.random() * pool.length)];
        const evt = {
          id: String(Date.now()),
          result: (r as any).diseaseName || 'Unknown',
          confidence: Math.round((r as any).confidence || 95) - Math.floor(Math.random() * 5),
          region: ['Central Zone', 'Coastal Belt', 'Highlands', 'Valley'][Math.floor(Math.random() * 4)]
        };
        return [evt, ...prev].slice(0, 5);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [scanHistory]);

  // Disease scan trends
  const trendsMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = safeDate(); d.setDate(d.getDate() - i);
    trendsMap.set(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 0);
  }
  scanHistory.forEach(s => {
    const d = safeDate(s.createdAt);
    const k = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (trendsMap.has(k)) trendsMap.set(k, trendsMap.get(k)! + 1);
  });
  const trends = Array.from(trendsMap.entries()).map(([month, scans]) => ({ month, scans }));

  // Outbreak aggregation
  const outbreaks = (() => {
    const map: Record<string, { count: number; conf: number; type: string }> = {};
    scanHistory.forEach(s => {
      if (s.diseaseName === 'Healthy') return;
      const n = s.diseaseName;
      let t = 'Unknown';
      if (/blast|spot|blight|rust/i.test(n)) t = 'Fungal';
      else if (/bacterial/i.test(n)) t = 'Bacterial';
      else if (/borer|hopper/i.test(n)) t = 'Pest';
      if (!map[n]) map[n] = { count: 0, conf: 0, type: t };
      map[n].count += 1;
      map[n].conf += (s.confidence || 85);
    });
    return Object.entries(map).map(([disease, d]) => {
      const risk = Math.min(100, Math.round(d.count * 10 + (d.conf / d.count) * 20));
      return { disease, type: d.type, risk, count: d.count };
    }).sort((a, b) => b.risk - a.risk).slice(0, 4);
  })();

  const totalScans = scanHistory.length;
  const highRisk = scanHistory.filter(s => s.severity === 'high' || s.severity === 'critical').length;
  const avgConf = totalScans > 0 ? Math.round(scanHistory.reduce((a, s) => a + s.confidence, 0) / totalScans) : 0;

  return (
    <div className="min-h-screen pt-4 pb-16 md:pt-8 bg-background overflow-x-hidden relative">
      {/* Ambient glows — indigo/violet for scientist identity */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-500/10 rounded-full blur-[120px] mix-blend-screen opacity-30" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">

        {/* ── Header ── */}
        <motion.div initial="hidden" animate="visible" className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <motion.p custom={0} variants={fadeUp} className="text-sm text-indigo-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> Research Command Center
            </motion.p>
            <motion.h1 custom={1} variants={fadeUp} className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
              {greeting}, <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Dr. {userName}</span>
            </motion.h1>
            <motion.p custom={2} variants={fadeUp} className="text-muted-foreground mt-2 font-medium">
              AI-powered pathology intelligence and research analytics dashboard.
            </motion.p>
          </div>
          <motion.div custom={3} variants={fadeUp} className="flex gap-3">
            <Link to="/upload" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all hover:-translate-y-0.5">
              <ScanLine className="w-5 h-5" /> Analyze Sample
            </Link>
          </motion.div>
        </motion.div>

        {/* ── KPI Strip ── */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Analyses', value: totalScans, icon: Database, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            { label: 'High Risk Detected', value: highRisk, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { label: 'Avg Confidence', value: `${avgConf}%`, icon: Target, color: 'text-violet-500', bg: 'bg-violet-500/10' },
            { label: 'Model Accuracy', value: '95.8%', icon: Cpu, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
          ].map((kpi) => (
            <div key={kpi.label} className="glass rounded-2xl p-4 border border-border/40 flex items-center gap-3 hover:border-indigo-500/30 transition-colors">
              <div className={`p-2.5 rounded-xl ${kpi.bg}`}><kpi.icon className={`w-5 h-5 ${kpi.color}`} /></div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{kpi.label}</p>
                <p className="text-xl font-black text-foreground">{kpi.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Pathogen Scan Trends */}
            <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="glass rounded-3xl p-6 border border-border/40">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-xl flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" /> Pathogen Detection Trends
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Disease scans — last 7 days</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-muted-foreground">Critical Detections</p>
                  <p className={cn("font-black text-2xl", highRisk > 0 ? "text-rose-500" : "text-indigo-500")}>{highRisk}</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="colorSci" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 500 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 12, fontWeight: 500 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '1rem' }} itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="scans" stroke="#6366f1" fill="url(#colorSci)" strokeWidth={3} activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* AI Forecasting + Environmental Correlation row */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* AI Forecasting */}
              <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="glass p-6 rounded-3xl border border-border/40 hover:border-violet-500/30 transition-colors relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BrainCircuit className="w-24 h-24 text-violet-500 -rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                    <BrainCircuit className="w-6 h-6 text-violet-500" />
                  </div>
                  <h3 className="font-bold text-xl mb-4">AI Forecasting</h3>
                  <div className="space-y-3">
                    {forecasts.map((f, i) => (
                      <div key={i} className="relative pl-4 border-l-2 border-border hover:border-violet-500 transition-colors">
                        <div className={`absolute -left-1.5 top-1.5 w-2.5 h-2.5 rounded-full ${
                          f.status === 'critical' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' :
                          f.status === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' :
                          'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                        }`} />
                        <h4 className="text-sm font-bold">{f.prediction}</h4>
                        <p className="text-xs text-muted-foreground">{f.region} · {f.timeframe} · <span className="text-violet-500 font-bold">{f.confidence}%</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Global Vulnerability Radar */}
              <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible" className="glass p-6 rounded-3xl border border-border/40 hover:border-indigo-500/30 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-indigo-500" />
                </div>
                <h3 className="font-bold text-xl mb-2">Vulnerability Index</h3>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={vulnerabilityData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                      <Radar name="Risk" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Dataset Intelligence */}
            <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible" className="glass rounded-3xl p-6 border border-border/40">
              <h3 className="font-bold text-xl flex items-center gap-2 mb-6">
                <Database className="w-5 h-5 text-fuchsia-500" /> Dataset Intelligence
              </h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datasetDist} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal vertical={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="class" stroke="hsl(var(--muted-foreground))" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} width={60} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Samples">
                      {datasetDist.map((e, i) => (
                        <Cell key={i} fill={e.count < 3000 ? '#f43f5e' : e.count < 7000 ? '#f59e0b' : '#a855f7'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* ── Right Sidebar (4 cols) ── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Outbreak Monitor */}
            <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="glass rounded-3xl p-6 border border-border/40">
              <h3 className="font-bold text-xl flex items-center gap-2 mb-6">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> Outbreak Monitor
              </h3>
              {outbreaks.length === 0 ? (
                <div className="text-center py-8 opacity-50">
                  <Bug className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">No outbreaks detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {outbreaks.map((o, i) => {
                    const color = o.risk > 70 ? 'text-rose-500' : o.risk > 40 ? 'text-amber-500' : 'text-cyan-500';
                    const bar = o.risk > 70 ? 'bg-rose-500' : o.risk > 40 ? 'bg-amber-500' : 'bg-cyan-500';
                    return (
                      <div key={i} className="p-3 rounded-xl bg-accent/30 border border-border/40">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold truncate">{o.disease}</span>
                          <span className={cn("text-xs font-bold", color)}>{o.risk}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <span>{o.type}</span><span>·</span><span>{o.count} scans</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${o.risk}%` }} transition={{ duration: 1, delay: i * 0.1 }} className={`h-full rounded-full ${bar}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Live Scan Stream */}
            <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible" className="glass rounded-3xl p-6 border border-border/40 flex flex-col h-[380px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <Radio className="w-5 h-5 text-amber-500 animate-pulse" /> Live Stream
                </h3>
                <Link to="/history" className="text-xs font-bold text-indigo-500 hover:underline">View All</Link>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[hsl(var(--card))] to-transparent z-10 pointer-events-none" />
                <div className="space-y-3">
                  {liveStream.map((evt) => (
                    <motion.div key={evt.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 border border-border/40">
                      <div className="p-2 rounded-lg bg-indigo-500/10"><ScanLine className="w-4 h-4 text-indigo-500" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{evt.result}</p>
                        <p className="text-[10px] text-muted-foreground">{evt.region}</p>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">{evt.confidence}%</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* ── Research Feed ── */}
        <motion.div custom={8} variants={fadeUp} initial="hidden" animate="visible" className="pt-6">
          <h3 className="font-bold text-2xl flex items-center gap-2 mb-6">
            <BookOpen className="w-6 h-6 text-indigo-500" /> Research & Literature Feed
          </h3>
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="h-64 bg-muted/50 rounded-3xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {news.slice(0, 4).map((item, idx) => (
                <a key={idx} href={item.url} target="_blank" rel="noreferrer" className="group rounded-3xl overflow-hidden glass border border-border/40 hover:border-indigo-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col h-full">
                  <div className="h-40 w-full bg-black/50 overflow-hidden relative">
                    <img src={item.urlToImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute top-3 left-3 px-2 py-1 bg-indigo-600/80 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider">
                      {item.category || 'Research'}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h4 className="font-bold text-sm leading-snug mb-2 group-hover:text-indigo-500 transition-colors line-clamp-2">{item.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1">{item.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[10px] font-semibold text-muted-foreground">{item.source.name}</span>
                      <span className="text-[10px] text-indigo-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Read <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
