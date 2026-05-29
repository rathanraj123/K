import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, CheckCircle2, TrendingUp, AlertTriangle, FileText, Activity, 
  MapPin, ShieldAlert, FlaskConical, Target, Clock, Zap, X, Droplets
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  useDashboardOverview, useDiseaseTrends, useRecentActivity, 
  useTopDiseases, useScanInsights, useInsightFeed, useLiveDashboard, useHeatmapData, usePredictions
} from '../../hooks/useDashboard';
import { useAppStore } from '@/store/useAppStore';
import DashboardMap from '../../components/scientist/DashboardMap';

// --- Theme Constants ---
const theme = {
  bg: 'bg-slate-950',
  card: 'bg-slate-900/50 backdrop-blur-xl border border-slate-800/50',
  glowBorder: 'border-cyan-500/30 hover:border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
  text: 'text-slate-300',
  heading: 'text-white',
  cyan: 'text-cyan-400',
  teal: 'text-teal-400',
  emerald: 'text-emerald-400',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

// --- Mock Data ---
const trendData = [
  { day: 'Mon', blight: 400, spot: 240, blast: 150, smut: 80, tungro: 50 },
  { day: 'Tue', blight: 430, spot: 220, blast: 180, smut: 90, tungro: 60 },
  { day: 'Wed', blight: 480, spot: 250, blast: 200, smut: 110, tungro: 55 },
  { day: 'Thu', blight: 510, spot: 280, blast: 190, smut: 100, tungro: 70 },
  { day: 'Fri', blight: 590, spot: 290, blast: 210, smut: 130, tungro: 85 },
  { day: 'Sat', blight: 650, spot: 310, blast: 240, smut: 150, tungro: 90 },
  { day: 'Sun', blight: 720, spot: 340, blast: 260, smut: 160, tungro: 110 },
];

const diseasePieData = [
  { name: 'Bacterial Leaf Blight', value: 45 },
  { name: 'Brown Spot', value: 25 },
  { name: 'Leaf Blast', value: 15 },
  { name: 'Others', value: 15 },
];
const pieColors = ['#22d3ee', '#2dd4bf', '#34d399', '#818cf8'];

// --- Components ---

function InsightAlert() {
  const [visible, setVisible] = useState(true);
  
  if (!visible) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative overflow-hidden rounded-2xl bg-slate-900/80 backdrop-blur-md border border-rose-500/30 p-4 mb-8 flex items-start gap-4 shadow-[0_0_30px_rgba(244,63,94,0.1)] group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent opacity-50" />
      <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)]" />
      
      <div className="p-2 bg-rose-500/20 rounded-xl relative z-10">
        <AlertTriangle className="w-5 h-5 text-rose-400" />
      </div>
      
      <div className="flex-1 relative z-10">
        <h4 className="text-rose-100 font-semibold text-sm">Critical Insight Detected</h4>
        <p className="text-slate-300 text-sm mt-0.5">
          <strong className="text-rose-400">Bacterial Leaf Blight</strong> cases in Rice increased by <span className="text-white font-bold">18%</span> in the last 7 days across 5 districts. Immediate monitoring recommended.
        </p>
      </div>
      
      <button onClick={() => setVisible(false)} className="relative z-10 p-1 text-slate-500 hover:text-white transition-colors">
        <X className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

function StatCard({ title, value, trend, icon: Icon, colorClass }: any) {
  return (
    <motion.div variants={itemVariants} className={`${theme.card} p-6 rounded-2xl ${theme.glowBorder} relative overflow-hidden group transition-all duration-300 hover:scale-[1.02]`}>
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:from-white/10 transition-all" />
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-400 font-medium text-sm">{title}</h3>
        <div className={`p-2 rounded-lg bg-slate-800/50 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="space-y-1">
        <h2 className="text-3xl font-bold text-white tracking-tight">{value}</h2>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <TrendingUp className={`w-3.5 h-3.5 ${colorClass}`} />
          <span className={colorClass}>{trend}</span>
          <span className="text-slate-500">vs last week</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function ScientistDashboard() {
  const userName = useAppStore(s => s.userName);
  // Optional: Connect to live WebSocket telemetry
  
  const { data: overviewData } = useDashboardOverview();
  const { data: trendsData } = useDiseaseTrends();
  const { data: activityData } = useRecentActivity();
  const { data: topDiseasesData } = useTopDiseases();
  const { data: scanInsights } = useScanInsights();
  const { data: feedData } = useInsightFeed();
  const { data: predictionData } = usePredictions();
  const { data: heatmapData } = useHeatmapData();

  // Activate live WebSocket connections
  useLiveDashboard();

  const finalOverview = overviewData || {
    total_scans_analyzed: 0, total_scans_trend: '0%',
    average_confidence: 0, confidence_trend: '0%',
    high_risk_detections: 0, high_risk_trend: '0%',
    reports_generated: 0, reports_trend: '0%'
  };

  const finalTrendData = trendsData || [];
  const finalDiseasePieData = topDiseasesData || [];
  const primaryPercentage = finalDiseasePieData[0] ? `${finalDiseasePieData[0].value}%` : '0%';

  const finalActivity = activityData || [];

  const getActivityIconAndColor = (type: string) => {
    switch(type) {
      case 'anomaly': return { icon: Zap, color: 'text-rose-400', bg: 'bg-rose-500/20' };
      case 'report': return { icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
      case 'heatmap': return { icon: MapPin, color: 'text-cyan-400', bg: 'bg-cyan-500/20' };
      case 'scan': return { icon: Activity, color: 'text-teal-400', bg: 'bg-teal-500/20' };
      default: return { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-500/20' };
    }
  };

  const finalScanInsights = scanInsights || [];
  const getInsightIconAndColor = (type: string) => {
    switch(type) {
      case 'crop': return { icon: Droplets, color: 'text-cyan-400' };
      case 'time': return { icon: Clock, color: 'text-emerald-400' };
      case 'location': return { icon: MapPin, color: 'text-rose-400' };
      case 'severity': return { icon: Activity, color: 'text-amber-400' };
      default: return { icon: Target, color: 'text-slate-400' };
    }
  };

  const finalFeed = feedData || [];
  const getFeedColor = (severity: string) => {
    switch(severity) {
      case 'high': return 'from-rose-500 to-orange-500';
      case 'medium': return 'from-cyan-500 to-blue-500';
      case 'info': return 'from-emerald-500 to-teal-500';
      case 'low': return 'from-purple-500 to-pink-500';
      default: return 'from-slate-500 to-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-cyan-500/30 overflow-hidden pt-20">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] bg-teal-500/10 rounded-full blur-[120px]" />
      </div>

      <main className="max-w-[1600px] mx-auto px-6 py-8 relative z-10 h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
          
          {/* Hero */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4">
            <div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
                Good Morning, {userName || 'Scientist'}
              </h1>
              <p className="text-slate-400">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold mr-2 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                </span>
                AI-powered disease intelligence and agricultural monitoring dashboard
              </p>
            </div>
            <Link 
              to="/upload" 
              className="h-11 px-6 rounded-xl font-bold text-slate-900 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all flex items-center gap-2 cursor-pointer z-50">
              <Activity className="w-4 h-4" />
              New Analysis
            </Link>
          </motion.div>

          <AnimatePresence>
            <InsightAlert />
          </AnimatePresence>

          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Scans Analyzed" value={finalOverview.total_scans_analyzed?.toLocaleString?.() ?? finalOverview.total_scans_analyzed} trend={finalOverview.total_scans_trend} icon={CheckCircle2} colorClass="text-cyan-400" />
            <StatCard title="Average Confidence" value={`${finalOverview.average_confidence}%`} trend={finalOverview.confidence_trend} icon={Target} colorClass="text-teal-400" />
            <StatCard title="High Risk Detections" value={finalOverview.high_risk_detections?.toLocaleString?.() ?? finalOverview.high_risk_detections} trend={finalOverview.high_risk_trend} icon={ShieldAlert} colorClass="text-rose-400" />
            <StatCard title="Reports Generated" value={finalOverview.reports_generated?.toLocaleString?.() ?? finalOverview.reports_generated} trend={finalOverview.reports_trend} icon={FileText} colorClass="text-emerald-400" />
          </div>

          {/* Main Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className={`lg:col-span-2 ${theme.card} p-6 rounded-2xl ${theme.glowBorder} flex flex-col`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Disease Detection Trends</h3>
                  <p className="text-sm text-slate-400">Multi-pathogen time series over the last 7 days</p>
                </div>
                <select className="bg-slate-900 border border-slate-700 text-sm text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-cyan-500 transition-colors">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </div>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={finalTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc' }}
                      itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                    />
                    <Line type="monotone" dataKey="blight" name="Leaf Blight" stroke="#22d3ee" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#22d3ee' }} />
                    <Line type="monotone" dataKey="spot" name="Brown Spot" stroke="#2dd4bf" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="blast" name="Leaf Blast" stroke="#34d399" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className={`${theme.card} p-6 rounded-2xl ${theme.glowBorder} flex flex-col`}>
              <h3 className="text-lg font-bold text-white mb-6">Recent Research Activity</h3>
              <div className="flex-1 space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-700 before:to-transparent">
                {finalActivity.map((item: any, i: number) => {
                  const style = getActivityIconAndColor(item.type);
                  const Icon = style.icon;
                  return (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10 bg-slate-900">
                        <div className={`w-full h-full rounded-full flex items-center justify-center ${style.bg}`}>
                          <Icon className={`w-4 h-4 ${style.color}`} />
                        </div>
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-white text-sm">{item.title}</h4>
                          <span className="text-[10px] text-slate-500">{item.time}</span>
                        </div>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className={`${theme.card} p-6 rounded-2xl ${theme.glowBorder} flex flex-col min-h-[350px]`}>
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h3 className="text-lg font-bold text-white">Disease Distribution</h3>
                  <p className="text-sm text-slate-400 mb-4">Regional hotspot monitoring</p>
                </div>
                <select className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2 py-1 outline-none focus:border-cyan-500 cursor-pointer">
                  <option>Today</option>
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                  <option>Last 90 Days</option>
                </select>
              </div>
              <div className="flex-1 relative min-h-[250px]">
                <DashboardMap data={heatmapData || []} />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className={`${theme.card} p-6 rounded-2xl ${theme.glowBorder} flex flex-col`}>
              <h3 className="text-lg font-bold text-white mb-1">Top Detected Diseases</h3>
              <p className="text-sm text-slate-400 mb-4">Pathogen classification breakdown</p>
              <div className="flex-1 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={finalDiseasePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {finalDiseasePieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '14px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-2xl font-bold text-white">{primaryPercentage}</span>
                  <span className="text-xs text-slate-400">Primary</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {finalDiseasePieData.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[i] }} />
                    <span className="text-xs text-slate-300">{item.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className={`${theme.card} p-6 rounded-2xl ${theme.glowBorder} flex flex-col`}>
              <h3 className="text-lg font-bold text-white mb-6">Scan Insights</h3>
              <div className="space-y-4 flex-1">
                {finalScanInsights.map((stat: any, i: number) => {
                  const style = getInsightIconAndColor(stat.type);
                  const Icon = style.icon;
                  return (
                    <div key={i} className="flex items-center p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                      <div className={`p-2.5 rounded-lg bg-slate-900 ${style.color} mr-4`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">{stat.label}</p>
                        <p className="text-sm font-bold text-white">{stat.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>



        </motion.div>
      </main>
    </div>
  );
}
