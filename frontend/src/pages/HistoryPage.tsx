import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Leaf, Grid3X3, List, AlertTriangle, ChevronLeft, 
  Sprout, Calendar, ArrowRight, ShieldCheck, Zap, Activity, ScanLine
} from 'lucide-react';
import { useAppStore, ScanResult } from '@/store/useAppStore';
import { Link } from 'react-router-dom';
import { safeDate, cn } from '@/lib/utils';
import ScanResultDashboard from '@/components/scan/ScanResultDashboard';

const CROP_FILTERS = ['All', 'Rice', 'Wheat', 'Tomato', 'Potato', 'Cotton', 'Maize', 'Sugarcane'];
const SEVERITY_FILTERS = [
  { id: 'all', label: 'All Risks' },
  { id: 'low', label: 'Healthy/Low' },
  { id: 'medium', label: 'Monitor' },
  { id: 'high', label: 'High Risk' },
  { id: 'critical', label: 'Critical' }
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function HistoryPage() {
  const scanHistory = useAppStore(s => s.scanHistory);
  const token = useAppStore(s => s.token);
  const fetchHistory = useAppStore(s => s.fetchHistory);
  
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [cropFilter, setCropFilter] = useState('All');
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);

  useEffect(() => {
    if (token) fetchHistory();
  }, [token, fetchHistory]);

  const filtered = useMemo(() => {
    return scanHistory.filter((s) => {
      const safeDiseaseName = s.diseaseName || 'Processing...';
      const matchesSearch = safeDiseaseName.toLowerCase().includes(search.toLowerCase());
      const matchesSeverity = severityFilter === 'all' || 
        (severityFilter === 'low' && s.severity === 'low') ||
        (severityFilter === 'medium' && s.severity === 'medium') ||
        (severityFilter === 'high' && s.severity === 'high') ||
        (severityFilter === 'critical' && s.severity === 'critical');
      const matchesCrop = cropFilter === 'All' || s.cropType === cropFilter;
      return matchesSearch && matchesSeverity && matchesCrop;
    });
  }, [scanHistory, search, severityFilter, cropFilter]);

  // Analytics Math
  const totalScans = scanHistory.length;
  const healthyScans = scanHistory.filter(s => s.severity === 'low').length;
  const healthyPercentage = totalScans > 0 ? Math.round((healthyScans / totalScans) * 100) : 0;
  
  const diseaseCounts = scanHistory.reduce((acc, s) => {
    if (s.severity !== 'low') {
      const name = s.diseaseName || 'Unknown';
      acc[name] = (acc[name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const mostCommonDisease = Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  const severityBadge = (s: string) => {
    if (s === 'low') return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    if (s === 'medium') return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    return 'bg-red-500/10 text-red-500 border border-red-500/20';
  };

  const getFarmerInsight = (scan: ScanResult) => {
    if (scan.severity === 'low') return "Crop appears healthy. Continue normal irrigation and fertilizer schedule.";
    if (scan.severity === 'medium') return "Early signs of stress or disease detected. Monitor closely over the next 48 hours.";
    if (scan.severity === 'high' || scan.severity === 'critical') return "Immediate intervention required to prevent spread. Apply recommended treatments.";
    return "Scan complete. Check report for details.";
  };

  if (selectedScan) {
    return (
      <div className="flex-1 p-4 md:p-8 bg-background relative overflow-y-auto overflow-x-hidden min-h-screen pt-12 md:pt-16">
        <div className="max-w-6xl mx-auto space-y-6 w-full">
          <div className="flex items-center justify-between mb-8 mt-4">
            <button onClick={() => setSelectedScan(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-accent hover:bg-accent/80 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to Timeline
            </button>
          </div>
          <ScanResultDashboard result={selectedScan} isFarmer={true} onNewScan={() => setSelectedScan(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 pb-16 md:pt-8 bg-background relative overflow-x-hidden">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[150px] mix-blend-screen opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* HERO HEADER */}
        <motion.div initial="hidden" animate="visible" className="mb-8 p-8 sm:p-10 rounded-3xl relative overflow-hidden bg-gradient-to-br from-card to-background border border-border/40 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Activity className="w-48 h-48 text-emerald-500" />
          </div>
          <div className="relative z-10">
            <motion.p custom={0} variants={fadeUp} className="text-sm text-emerald-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Smart Memory System
            </motion.p>
            <motion.h1 custom={1} variants={fadeUp} className="text-4xl sm:text-5xl font-black tracking-tight text-foreground mb-4">
              Crop Scan <span className="text-emerald-500">History</span>
            </motion.h1>
            <motion.p custom={2} variants={fadeUp} className="text-muted-foreground font-medium max-w-xl text-lg">
              Track your crop health journey, monitor disease progression, and review past AI recommendations.
            </motion.p>

            <motion.div custom={3} variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              <div className="p-4 rounded-2xl bg-background/50 backdrop-blur-md border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Total Scans</p>
                <p className="text-2xl font-black">{totalScans}</p>
              </div>
              <div className="p-4 rounded-2xl bg-background/50 backdrop-blur-md border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Healthy %</p>
                <p className="text-2xl font-black text-emerald-500">{healthyPercentage}%</p>
              </div>
              <div className="p-4 rounded-2xl bg-background/50 backdrop-blur-md border border-border/50 col-span-2 sm:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Most Common Issue</p>
                <p className="text-xl font-bold truncate text-amber-500">{mostCommonDisease}</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* SMART SEARCH & FILTERS */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="sticky top-20 z-20 bg-background/80 backdrop-blur-xl pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search by disease or crop..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-card border border-border/50 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-sm" 
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar shrink-0 items-center">
               <div className="flex bg-card p-1 rounded-2xl border border-border/50 mr-2 shrink-0">
                  <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-xl transition-colors", viewMode === 'grid' ? 'bg-emerald-500/10 text-emerald-500' : 'text-muted-foreground hover:bg-accent')}><Grid3X3 className="w-5 h-5" /></button>
                  <button onClick={() => setViewMode('timeline')} className={cn("p-2 rounded-xl transition-colors", viewMode === 'timeline' ? 'bg-emerald-500/10 text-emerald-500' : 'text-muted-foreground hover:bg-accent')}><List className="w-5 h-5" /></button>
               </div>
               
               <div className="flex gap-2">
                 {SEVERITY_FILTERS.map(f => (
                   <button 
                     key={f.id} 
                     onClick={() => setSeverityFilter(f.id)}
                     className={cn("px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all", 
                       severityFilter === f.id 
                         ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                         : "bg-card border border-border/50 text-muted-foreground hover:bg-accent"
                     )}
                   >
                     {f.label}
                   </button>
                 ))}
               </div>
            </div>
          </div>
        </motion.div>

        {/* RESULTS GRID/TIMELINE */}
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl border border-border/40 p-16 text-center bg-card/50">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <Leaf className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="font-black text-2xl mb-2">{scanHistory.length === 0 ? 'No scans in your history' : 'No results found'}</h3>
            <p className="text-muted-foreground font-medium mb-8 max-w-sm mx-auto">
              {scanHistory.length === 0 ? 'Take your first photo of a crop to start tracking its health.' : 'Try adjusting your filters or search terms.'}
            </p>
            {scanHistory.length === 0 && (
              <Link to="/upload" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-500 text-white font-bold hover:shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all">
                <ScanLine className="w-5 h-5" /> Start Scanning
              </Link>
            )}
          </motion.div>
        ) : viewMode === 'grid' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((scan, i) => (
                <motion.div
                  key={scan.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  className="bg-card rounded-3xl overflow-hidden border border-border/40 hover:border-emerald-500/30 transition-all hover:shadow-2xl hover:shadow-emerald-500/5 group flex flex-col"
                >
                  <div className="relative h-56 bg-black overflow-hidden shrink-0 cursor-pointer" onClick={() => setSelectedScan(scan)}>
                    <img src={scan.imageUrl} alt={scan.diseaseName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="absolute top-4 left-4 flex gap-2">
                       <span className={cn("text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md", severityBadge(scan.severity))}>
                         {scan.severity === 'low' ? 'Healthy' : scan.severity}
                       </span>
                    </div>
                    
                    <div className="absolute bottom-4 left-4 right-4">
                       <h3 className="font-black text-white text-xl shadow-black drop-shadow-lg truncate">{scan.diseaseName.replace(/_/g, ' ')}</h3>
                       <div className="flex items-center gap-3 text-white/80 text-xs font-semibold mt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {safeDate(scan.createdAt).toLocaleDateString()}</span>
                          {scan.cropType && <span className="flex items-center gap-1"><Sprout className="w-3.5 h-3.5" /> {scan.cropType}</span>}
                       </div>
                    </div>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col bg-card">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-primary/10 shrink-0 mt-0.5">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed line-clamp-2">
                        {getFarmerInsight(scan)}
                      </p>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-border/50 flex gap-3">
                       <button onClick={() => setSelectedScan(scan)} className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent/80 font-bold text-sm transition-colors text-foreground">
                         View Full Report
                       </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="relative border-l-2 border-border/50 ml-4 sm:ml-8 space-y-8 pb-8">
            <AnimatePresence mode="popLayout">
              {filtered.map((scan, i) => (
                <motion.div
                  key={scan.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  className="relative pl-6 sm:pl-8 group"
                >
                  {/* Timeline Dot */}
                  <div className={cn("absolute left-[-9px] top-4 w-4 h-4 rounded-full border-4 border-background", 
                    scan.severity === 'critical' || scan.severity === 'high' ? 'bg-red-500' : 
                    scan.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />
                  
                  <div className="bg-card rounded-3xl p-4 sm:p-6 border border-border/40 hover:border-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/5 sm:flex gap-6 cursor-pointer" onClick={() => setSelectedScan(scan)}>
                     <div className="w-full sm:w-48 h-32 rounded-2xl bg-black overflow-hidden shrink-0 mb-4 sm:mb-0 relative">
                        <img src={scan.imageUrl} alt={scan.diseaseName} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
                        <span className={cn("absolute bottom-2 left-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md backdrop-blur-md", severityBadge(scan.severity))}>
                         {scan.severity === 'low' ? 'Healthy' : scan.severity}
                       </span>
                     </div>
                     <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                          <Calendar className="w-3.5 h-3.5" /> {safeDate(scan.createdAt).toLocaleDateString()}
                          {scan.cropType && <><span className="w-1 h-1 rounded-full bg-muted-foreground/50" /> <Sprout className="w-3.5 h-3.5" /> {scan.cropType}</>}
                        </div>
                        <h3 className="font-black text-xl mb-2">{scan.diseaseName.replace(/_/g, ' ')}</h3>
                        <p className="text-sm font-medium text-muted-foreground line-clamp-2 mb-3">
                           {getFarmerInsight(scan)}
                        </p>
                        <div className="flex items-center gap-1 text-emerald-500 font-bold text-sm mt-auto group-hover:gap-2 transition-all">
                           Open Report <ArrowRight className="w-4 h-4" />
                        </div>
                     </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}
