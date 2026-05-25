import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Upload, History, ScanLine, Clock, ArrowRight, Leaf, BarChart3, Target, AlertTriangle, Thermometer, CloudRain, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '@/lib/api';
import { safeDate } from '@/lib/utils';

const PIE_COLORS = ['hsl(142, 76%, 36%)', 'hsl(45, 93%, 47%)', 'hsl(243, 75%, 59%)', 'hsl(0, 84%, 60%)'];

interface AnalyticsResponse<T> {
  success: boolean;
  data: T[];
}

interface DiseaseTrend {
  disease?: string;
  occurrences: number;
}

interface TrendPoint {
  month: string;
  scans: number;
}

interface DistributionPoint {
  name: string;
  value: number;
}

interface WeatherInsights {
  temperature_c?: number;
  humidity_percent?: number;
  rainfall_mm?: number;
  agri_warnings?: string[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function DashboardPage() {
  const { userName, scanHistory, userRole, token, fetchHistory } = useAppStore();
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [distribution, setDistribution] = useState<DistributionPoint[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherInsights | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<string[]>([]);
  const [temp, setTemp] = useState('—');
  const totalScans = scanHistory.length;
  const hour = safeDate().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const isFarmer = String(userRole).toLowerCase() === 'farmer';

  useEffect(() => {
    if (token) {
      fetchHistory();
      
      // Robust location fetching
      const defaultLat = 17.3850;
      const defaultLon = 78.4867;
      
      let locationFetched = false;
      
      const doFetch = (lat: number, lon: number) => {
        if (!locationFetched) {
          locationFetched = true;
          fetchDashboardData(lat, lon);
        }
      };

      // Fallback timer (3 seconds)
      const timeoutId = setTimeout(() => {
        doFetch(defaultLat, defaultLon);
      }, 3000);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            doFetch(pos.coords.latitude, pos.coords.longitude);
          },
          (err) => {
            clearTimeout(timeoutId);
            doFetch(defaultLat, defaultLon);
          },
          { timeout: 3000, maximumAge: 60000 }
        );
      } else {
        clearTimeout(timeoutId);
        doFetch(defaultLat, defaultLon);
      }
    }
  }, [fetchHistory, token]);

  // Calculate charts based on actual user history
  useEffect(() => {
    if (!scanHistory) return;

    // Disease Distribution Pie Chart
    const distMap = new Map<string, number>();
    scanHistory.forEach(s => {
      const name = (s.diseaseName || 'Pending').split('_').pop() || 'Pending';
      distMap.set(name, (distMap.get(name) || 0) + 1);
    });
    setDistribution(Array.from(distMap.entries()).map(([name, value]) => ({ name, value })));

    // Scan Trends Area Chart (Last 7 Days)
    const trendsMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = safeDate();
      d.setDate(d.getDate() - i);
      trendsMap.set(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 0);
    }
    scanHistory.forEach(s => {
      const d = safeDate(s.createdAt);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (trendsMap.has(dateStr)) {
        trendsMap.set(dateStr, trendsMap.get(dateStr)! + 1);
      }
    });
    setTrends(Array.from(trendsMap.entries()).map(([month, scans]) => ({ month, scans })));
  }, [scanHistory]);

  const fetchDashboardData = async (lat: number, lon: number) => {
    try {
      const weatherRes = await api.get<WeatherInsights>(`/agriculture/weather-insights?lat=${lat}&lon=${lon}`);
      if (weatherRes) {
        setWeatherData(weatherRes);
        if (weatherRes.agri_warnings) {
          setWeatherAlerts(weatherRes.agri_warnings);
          if (weatherRes.temperature_c) {
            setTemp(`${Math.round(weatherRes.temperature_c)}°C`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  return (
    <div className="min-h-screen pt-8 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" className="mb-10">
          <motion.p custom={0} variants={fadeUp} className="text-sm text-muted-foreground font-medium">
            {greeting}, {userName} 👋
          </motion.p>
          <motion.h1 custom={1} variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold mt-1 tracking-tight">
            {isFarmer ? (
              <>Today's <span className="gradient-text">Crop Health</span></>
            ) : (
              <>Your <span className="gradient-text">Research Dashboard</span></>
            )}
          </motion.h1>
          <motion.p custom={2} variants={fadeUp} className="text-muted-foreground mt-2">
            {isFarmer
              ? 'Quick overview of your crops and recommended actions.'
              : 'Analytics, scan trends, and research insights at a glance.'}
          </motion.p>
        </motion.div>

        {/* Farmer Alert */}
        {isFarmer && weatherAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 glass rounded-2xl p-4 border-l-4 border-warning flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">🔴 Crop Alert</p>
              <p className="text-xs text-muted-foreground">{weatherAlerts[0]} <Link to="/upload" className="text-primary font-medium">Scan now →</Link></p>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div initial="hidden" animate="visible" className="grid sm:grid-cols-2 gap-4 mb-10">
          <motion.div custom={3} variants={fadeUp}>
            <Link to="/upload" className="glass rounded-2xl p-6 flex items-center gap-4 hover-lift group block">
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shrink-0 group-hover:shadow-lg transition-shadow">
                <Upload className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg">{isFarmer ? 'Quick Scan' : 'New Analysis'}</h3>
                <p className="text-sm text-muted-foreground">
                  {isFarmer ? 'Take a photo of your crop for instant diagnosis' : 'Upload a plant image for AI analysis'}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </motion.div>
          <motion.div custom={4} variants={fadeUp}>
            <Link to="/history" className="glass rounded-2xl p-6 flex items-center gap-4 hover-lift group block">
              <div className="w-14 h-14 rounded-xl gradient-secondary flex items-center justify-center shrink-0 group-hover:shadow-lg transition-shadow">
                <History className="w-7 h-7 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg">View History</h3>
                <p className="text-sm text-muted-foreground">Browse your past scan results</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-secondary transition-colors" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {(isFarmer
            ? [
                { icon: ScanLine, label: 'Scans Done', value: totalScans || 0, color: 'gradient-primary' },
                { icon: Thermometer, label: 'Crop Health', value: totalScans > 0 ? (scanHistory[0].severity === 'low' ? 'Good' : 'At Risk') : '—', color: 'gradient-secondary' },
                { icon: CloudRain, label: 'Weather', value: temp, color: 'gradient-primary' },
                { icon: AlertTriangle, label: 'Alerts', value: weatherAlerts.length, color: 'gradient-secondary' },
              ]
            : [
                { icon: ScanLine, label: 'Total Scans', value: totalScans || 0, color: 'gradient-primary' },
                { icon: Target, label: 'Avg Accuracy', value: totalScans > 0 ? (scanHistory.reduce((acc, s) => acc + s.confidence, 0) / totalScans).toFixed(1) + '%' : '—', color: 'gradient-secondary' },
                { icon: BarChart3, label: 'Reports Saved', value: totalScans || 0, color: 'gradient-primary' },
                { icon: Clock, label: 'Avg Speed', value: '1.2s', color: 'gradient-secondary' },
              ]
          ).map((card, i) => (
            <motion.div key={card.label} custom={5 + i} variants={fadeUp} className="glass rounded-2xl p-5 hover-lift">
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                <card.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="text-2xl font-extrabold">{card.value}</div>
              <div className="text-sm text-muted-foreground">{card.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Scientist Charts */}
        {!isFarmer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid md:grid-cols-2 gap-6 mb-10"
          >
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Scan Trends</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trends.length > 0 ? trends : [{ month: 'N/A', scans: 0 }]}>
                  <defs>
                    <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: 12, color: 'hsl(var(--foreground))' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Area type="monotone" dataKey="scans" stroke="hsl(160, 84%, 39%)" fill="url(#colorScans)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-secondary" />
                <h3 className="font-bold">Disease Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={distribution.length > 0 ? distribution : [{ name: 'N/A', value: 1 }]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {(distribution.length > 0 ? distribution : [{ name: 'N/A', value: 1 }]).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: 12, color: 'hsl(var(--foreground))' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {distribution.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Farmer Weather widget */}
        {isFarmer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-2xl p-6 mb-10"
          >
            <h3 className="font-bold text-lg mb-3">🌦️ Weather-Based Suggestions</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { 
                  label: 'Humidity', 
                  value: `${weatherData?.humidity_percent || 0}%`, 
                  tip: (weatherData?.humidity_percent || 0) > 80 ? 'High — watch for fungal disease' : 'Normal humidity levels' 
                },
                { 
                  label: 'Temperature', 
                  value: `${Math.round(weatherData?.temperature_c || 0)}°C`, 
                  tip: (weatherData?.temperature_c || 0) > 30 ? 'Heat stress possible' : 'Optimal growing range' 
                },
                { 
                  label: 'Rainfall', 
                  value: `${weatherData?.rainfall_mm || 0}mm / hr`, 
                  tip: (weatherData?.rainfall_mm || 0) > 2 ? 'Delay spraying chemicals' : 'Safe to proceed with field work' 
                },
              ].map((w) => (
                <div key={w.label} className="p-4 rounded-xl bg-accent/50">
                  <p className="text-xs text-muted-foreground">{w.label}</p>
                  <p className="text-xl font-bold mt-1">{w.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{w.tip}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="font-bold text-xl mb-4">Recent Activity</h2>
          {scanHistory.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto opacity-50">
                <Leaf className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <p className="font-medium text-lg">No scans yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isFarmer ? 'Take a photo of your crop to get started!' : 'Upload your first plant image to start building your dataset.'}
                </p>
              </div>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm"
              >
                <Upload className="w-4 h-4" />
                {isFarmer ? 'Scan Crop' : 'Upload Image'}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {scanHistory.slice(0, 5).map((scan) => (
                <Link
                  key={scan.id}
                  to="/history"
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Leaf className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{scan.diseaseName}</p>
                    <p className="text-xs text-muted-foreground">{safeDate(scan.createdAt).toLocaleDateString()}</p>
                  </div>
                  {isFarmer ? (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      scan.confidence >= 90 ? 'bg-success/10 text-success' :
                      scan.confidence >= 70 ? 'bg-warning/10 text-warning' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {scan.confidence >= 90 ? 'High' : scan.confidence >= 70 ? 'Medium' : 'Low'}
                    </span>
                  ) : (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      scan.severity === 'low' ? 'bg-success/10 text-success' :
                      scan.severity === 'medium' ? 'bg-warning/10 text-warning' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {Number(scan.confidence).toFixed(2)}%
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
