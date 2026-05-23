import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Leaf, Grid3X3, List, AlertTriangle, CheckCircle2, Download, ArrowLeftRight } from 'lucide-react';
import { useAppStore, ScanResult } from '@/store/useAppStore';
import { Link } from 'react-router-dom';

const CROP_FILTERS = ['All', 'Rice', 'Wheat', 'Tomato', 'Potato', 'Cotton', 'Maize', 'Sugarcane'];

export default function HistoryPage() {
  const { scanHistory, userRole, token, fetchHistory } = useAppStore();
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    if (token) fetchHistory();
  }, [token]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [cropFilter, setCropFilter] = useState('All');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const isFarmer = userRole === 'farmer';

  const filtered = scanHistory.filter((s) => {
    const safeDiseaseName = s.diseaseName || 'Processing...';
    const matchesSearch = safeDiseaseName.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || s.severity === severityFilter;
    const matchesCrop = cropFilter === 'All' || s.cropType === cropFilter;
    return matchesSearch && matchesSeverity && matchesCrop;
  });

  const toggleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev);
  };

  const compareScans = compareIds.map(id => scanHistory.find(s => s.id === id)).filter(Boolean) as ScanResult[];

  const severityBadge = (s: string) =>
    s === 'low' ? 'bg-success/10 text-success' :
    s === 'medium' ? 'bg-warning/10 text-warning' :
    'bg-destructive/10 text-destructive';

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Scan <span className="gradient-text">History</span>
              </h1>
              <p className="text-muted-foreground mt-2">Review and compare your past plant analyses.</p>
            </div>
            <div className="flex items-center gap-2">
              {!isFarmer && (
                <button onClick={() => setShowCompare(!showCompare)} className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${showCompare ? 'gradient-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'}`}>
                  <ArrowLeftRight className="w-3.5 h-3.5" /> Compare
                </button>
              )}
              <button className="px-3 py-2 rounded-xl glass text-xs font-semibold text-muted-foreground flex items-center gap-1.5 hover:text-foreground">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search by disease name..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="px-4 py-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-transparent">
            <option value="all" className="bg-background text-foreground">All Severity</option>
            <option value="low" className="bg-background text-foreground">Low</option>
            <option value="medium" className="bg-background text-foreground">Medium</option>
            <option value="high" className="bg-background text-foreground">High</option>
            <option value="critical" className="bg-background text-foreground">Critical</option>
          </select>
          <select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)} className="px-4 py-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-transparent">
            {CROP_FILTERS.map(c => <option key={c} value={c} className="bg-background text-foreground">{c === 'All' ? 'All Crops' : c}</option>)}
          </select>
          <div className="flex rounded-xl glass overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-accent text-primary' : 'text-muted-foreground'}`}><Grid3X3 className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-accent text-primary' : 'text-muted-foreground'}`}><List className="w-4 h-4" /></button>
          </div>
        </motion.div>

        {/* Compare panel */}
        {showCompare && compareScans.length === 2 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">Comparison</h3>
            <div className="grid grid-cols-2 gap-6">
              {compareScans.map((s) => (
                <div key={s.id} className="space-y-3">
                  <img src={s.imageUrl} alt={s.diseaseName} className="w-full h-32 object-contain rounded-xl bg-muted/50" />
                  <p className="font-bold">{s.diseaseName}</p>
                  <p className="text-sm text-muted-foreground">Confidence: {Number(s.confidence).toFixed(2)}%</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${severityBadge(s.severity)}`}>{s.severity}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-16 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 opacity-50">
              <Leaf className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="font-bold text-xl mb-2">{scanHistory.length === 0 ? 'No scans yet' : 'No results found'}</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {scanHistory.length === 0 ? 'Upload your first plant image to start building your history.' : 'Try adjusting your search or filters.'}
            </p>
            {scanHistory.length === 0 && (
              <Link to="/upload" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm">Start Scanning</Link>
            )}
          </motion.div>
        ) : viewMode === 'grid' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((scan, i) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass rounded-2xl overflow-hidden hover-lift group cursor-default ${showCompare && compareIds.includes(scan.id) ? 'ring-2 ring-primary' : ''}`}
                onClick={() => showCompare && toggleCompare(scan.id)}
              >
                <div className="relative h-40 bg-muted/50">
                  <img src={scan.imageUrl} alt={scan.diseaseName} className="w-full h-full object-contain" />
                  <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-lg ${severityBadge(scan.severity)}`}>{scan.severity}</span>
                  {showCompare && (
                    <div className={`absolute top-3 left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${compareIds.includes(scan.id) ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                      {compareIds.includes(scan.id) && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold">{scan.diseaseName}</h3>
                    <p className="text-xs text-muted-foreground">{new Date(scan.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  {scan.cropType && <span className="text-xs px-2 py-0.5 rounded-md bg-accent text-accent-foreground font-medium">{scan.cropType}</span>}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Confidence</span>
                    {isFarmer ? (
                      <span className={`font-semibold ${scan.confidence >= 90 ? 'text-success' : scan.confidence >= 70 ? 'text-warning' : 'text-destructive'}`}>
                        {scan.confidence >= 90 ? 'High' : scan.confidence >= 70 ? 'Medium' : 'Low'}
                      </span>
                    ) : (
                      <span className="font-semibold text-primary">{Number(scan.confidence).toFixed(2)}%</span>
                    )}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full gradient-primary" style={{ width: `${scan.confidence}%` }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((scan, i) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`glass rounded-xl p-4 flex items-center gap-4 hover-lift ${showCompare && compareIds.includes(scan.id) ? 'ring-2 ring-primary' : ''}`}
                onClick={() => showCompare && toggleCompare(scan.id)}
              >
                <img src={scan.imageUrl} alt={scan.diseaseName} className="w-12 h-12 rounded-lg object-contain bg-muted/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{scan.diseaseName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(scan.createdAt).toLocaleDateString()}{scan.cropType ? ` · ${scan.cropType}` : ''}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${severityBadge(scan.severity)} hidden sm:inline`}>{scan.severity}</span>
                <span className="text-sm font-semibold text-primary">{isFarmer ? (scan.confidence >= 90 ? 'High' : scan.confidence >= 70 ? 'Medium' : 'Low') : `${Number(scan.confidence).toFixed(2)}%`}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
