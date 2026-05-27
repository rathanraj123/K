import { useEffect, useState, lazy, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Upload, History, ScanLine, ArrowRight, Leaf, 
  AlertTriangle, Thermometer, CloudRain, TrendingUp, TrendingDown,
  Newspaper, MapPin, Zap, Activity, Info, X, DollarSign, Sprout
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { safeDate, cn } from '@/lib/utils';
import { fetchAgricultureNews, NewsArticle } from '@/services/newsService';
import { fetchMarketPrices, MarketPrice } from '@/services/marketPriceService';
import { RegionalReport } from '@/services/agricultureReportService';

const ScientistDashboard = lazy(() => import('@/pages/scientist/ScientistDashboard'));

interface WeatherInsights {
  temperature_c?: number;
  humidity_percent?: number;
  rainfall_mm?: number;
  agri_warnings?: string[];
  farming_suitability?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function DashboardPage() {
  const userName = useAppStore(s => s.userName);
  const scanHistory = useAppStore(s => s.scanHistory);
  const token = useAppStore(s => s.token);
  const fetchHistory = useAppStore(s => s.fetchHistory);
  const userRole = useAppStore(s => s.userRole);

  // Scientists and admins see the research-focused dashboard
  if (userRole === 'scientist' || userRole === 'admin') {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>}>
        <ScientistDashboard />
      </Suspense>
    );
  }
  
  const [weatherData, setWeatherData] = useState<WeatherInsights | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<string[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  // Generate Regional Reports dynamically from live weather, market prices, and scan history
  const regionalReports = useMemo<RegionalReport[]>(() => {
    const reports: RegionalReport[] = [];
    const regionName = weatherData?.city || "Your District";

    // 1. Disease / Scan Card
    if (scanHistory && scanHistory.length > 0) {
      const latestScan = scanHistory[0];
      reports.push({
        id: "rep_1",
        title: `Crop Health: ${latestScan.diseaseName}`,
        description: `Your last scan detected ${latestScan.diseaseName} with a severity of ${latestScan.severity || 'medium'}. Monitor your crops for progression.`,
        severity: latestScan.severity === 'critical' ? 'critical' : latestScan.severity === 'high' ? 'high' : 'medium',
        type: "disease",
        date: latestScan.createdAt || new Date().toISOString(),
        region: "Your Farm"
      });
    } else {
      reports.push({
        id: "rep_1",
        title: "Crop Disease Monitor",
        description: "No active disease threats detected on your farm. Keep uploading photos of plant leaves for regular health checks.",
        severity: "low",
        type: "disease",
        date: new Date().toISOString(),
        region: "Your District"
      });
    }

    // 2. Weather Card
    if (weatherData && weatherData.agri_warnings && weatherData.agri_warnings.length > 0) {
      reports.push({
        id: "rep_2",
        title: "Weather Alert",
        description: weatherData.agri_warnings.join('. '),
        severity: "critical",
        type: "weather",
        date: new Date().toISOString(),
        region: regionName
      });
    } else if (weatherData) {
      reports.push({
        id: "rep_2",
        title: "Weather Conditions",
        description: `Current condition: ${weatherData.description || 'Clear'}. Temp: ${weatherData.temperature_c}°C, Humidity: ${weatherData.humidity_percent}%. Stable conditions for outdoor activities.`,
        severity: "low",
        type: "weather",
        date: new Date().toISOString(),
        region: regionName
      });
    } else {
      reports.push({
        id: "rep_2",
        title: "Weather Report",
        description: "Loading localized weather warnings and insights...",
        severity: "low",
        type: "weather",
        date: new Date().toISOString(),
        region: regionName
      });
    }

    // 3. Market Card
    if (marketPrices && marketPrices.length > 0) {
      const topCrop = marketPrices[0];
      reports.push({
        id: "rep_3",
        title: `Mandi Price: ${topCrop.commodity}`,
        description: `${topCrop.commodity} is trading at ₹${topCrop.modal_price}/quintal in ${topCrop.market}. Price trend is ${topCrop.trend === 'up' ? 'rising' : topCrop.trend === 'down' ? 'declining' : 'stable'}.`,
        severity: topCrop.trend === 'down' ? 'medium' : 'low',
        type: "market",
        date: new Date().toISOString(),
        region: topCrop.market
      });
    } else {
      reports.push({
        id: "rep_3",
        title: "Market Procurement",
        description: "Government procurement updates and mandi crop price feeds are loading...",
        severity: "low",
        type: "market",
        date: new Date().toISOString(),
        region: "Statewide"
      });
    }

    // 4. Advisory Card
    if (weatherData) {
      const humidity = weatherData.humidity_percent || 50;
      const temp = weatherData.temperature_c || 25;
      let advisoryText = "Split application of Nitrogen fertilizer is recommended during early morning hours.";
      let severityVal: 'low' | 'medium' | 'high' | 'critical' = "low";

      if (humidity > 80) {
        advisoryText = "High humidity detected. Reduce overhead watering to minimize fungal spore germination.";
        severityVal = "medium";
      } else if (temp > 35) {
        advisoryText = "Extreme temperature warning. Mulch soil beds to preserve moisture and water in evening.";
        severityVal = "high";
      } else if (weatherData.rainfall_mm && weatherData.rainfall_mm > 2) {
        advisoryText = "Recent rainfall. Postpone scheduled chemical sprays and check field drainage pathways.";
        severityVal = "medium";
      }

      reports.push({
        id: "rep_4",
        title: "Agronomy Advisory",
        description: advisoryText,
        severity: severityVal,
        type: "advisory",
        date: new Date().toISOString(),
        region: regionName
      });
    } else {
      reports.push({
        id: "rep_4",
        title: "Soil & Crop Advisory",
        description: "Awaiting local environmental parameters to generate tailored crop recommendations.",
        severity: "low",
        type: "advisory",
        date: new Date().toISOString(),
        region: "Your District"
      });
    }

    return reports;
  }, [weatherData, marketPrices, scanHistory]);

  const hour = safeDate().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    if (token) {
      fetchHistory();
      
      const loadExternalData = async () => {
        setIsLoading(true);
        try {
          const [newsData, marketData] = await Promise.all([
            fetchAgricultureNews(),
            fetchMarketPrices()
          ]);
          setNews(newsData);
          setMarketPrices(marketData);
        } catch (e) {
          console.error("Error loading dashboard data", e);
        } finally {
          setIsLoading(false);
        }
      };

      loadExternalData();

      // Location fetching for weather
      const defaultLat = 17.3850;
      const defaultLon = 78.4867;
      let locationFetched = false;
      
      const doFetchWeather = async (lat: number, lon: number) => {
        if (locationFetched) return;
        locationFetched = true;
        try {
          const weatherRes = await api.get<WeatherInsights>(`/agriculture/weather-insights?lat=${lat}&lon=${lon}`);
          if (weatherRes) {
            setWeatherData(weatherRes);
            if (weatherRes.agri_warnings) {
              setWeatherAlerts(weatherRes.agri_warnings);
            }
          }
        } catch (error) {
          console.error('Failed to fetch weather data:', error);
        }
      };

      const timeoutId = setTimeout(() => doFetchWeather(defaultLat, defaultLon), 3000);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            doFetchWeather(pos.coords.latitude, pos.coords.longitude);
          },
          () => {
            clearTimeout(timeoutId);
            doFetchWeather(defaultLat, defaultLon);
          },
          { timeout: 3000, maximumAge: 60000 }
        );
      } else {
        clearTimeout(timeoutId);
        doFetchWeather(defaultLat, defaultLon);
      }
    }
  }, [fetchHistory, token]);

  // Calculate Scan Trends
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
  const trends = Array.from(trendsMap.entries()).map(([month, scans]) => ({ month, scans }));
  
  const recentHighRisk = scanHistory.filter(s => s.severity === 'high' || s.severity === 'critical').length;

  const dismissAlert = (alert: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alert));
  };

  return (
    <div className="min-h-screen pt-4 pb-16 md:pt-8 bg-background overflow-x-hidden relative">
      {/* Background ambient light */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] mix-blend-screen opacity-30" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        
        {/* Header Section */}
        <motion.div initial="hidden" animate="visible" className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <motion.p custom={0} variants={fadeUp} className="text-sm text-emerald-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sprout className="w-4 h-4" /> Smart Farming Center
            </motion.p>
            <motion.h1 custom={1} variants={fadeUp} className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
              {greeting}, <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{userName}</span>
            </motion.h1>
            <motion.p custom={2} variants={fadeUp} className="text-muted-foreground mt-2 font-medium">
              Your AI-powered agricultural intelligence and monitoring dashboard.
            </motion.p>
          </div>
          <motion.div custom={3} variants={fadeUp} className="flex gap-3">
             <Link to="/upload" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5">
               <ScanLine className="w-5 h-5" /> Quick Scan
             </Link>
          </motion.div>
        </motion.div>

        {/* Smart Alerts Panel */}
        <AnimatePresence>
          {weatherAlerts.filter(a => !dismissedAlerts.has(a)).map((alert, i) => (
            <motion.div
              key={alert}
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden glass rounded-2xl border-l-4 border-warning shadow-lg shadow-warning/5"
            >
              <div className="p-4 sm:p-5 flex items-start gap-4">
                <div className="p-2 rounded-xl bg-warning/10 shrink-0">
                  <AlertTriangle className="w-6 h-6 text-warning animate-pulse" />
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <h3 className="font-bold text-foreground text-base mb-1">Smart Alert</h3>
                  <p className="text-muted-foreground text-sm font-medium leading-relaxed">{alert}</p>
                </div>
                <button onClick={() => dismissAlert(alert)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Quick Actions & AI Recommendations */}
            <div className="grid sm:grid-cols-2 gap-6">
              <motion.div custom={4} variants={fadeUp} className="glass p-6 rounded-3xl border border-border/40 hover:border-emerald-500/30 transition-colors relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap className="w-24 h-24 text-emerald-500 -rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                    <Leaf className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-xl mb-2">AI Farming Insights</h3>
                  <p className="text-sm text-muted-foreground font-medium mb-4 line-clamp-2">
                    {weatherData?.humidity_percent && weatherData.humidity_percent > 70 
                      ? "High humidity detected. Proactive fungal spray recommended within 24hrs."
                      : "Conditions are optimal. Maintain regular irrigation schedule."}
                  </p>
                  <Link to="/history" className="text-emerald-500 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    View full AI report <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>

              <motion.div custom={5} variants={fadeUp} className="glass p-6 rounded-3xl border border-border/40 hover:border-cyan-500/30 transition-colors relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CloudRain className="w-24 h-24 text-cyan-500 -rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
                    <Thermometer className="w-6 h-6 text-cyan-500" />
                  </div>
                  <h3 className="font-bold text-xl mb-2">Weather Intelligence</h3>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Temp</p>
                      <p className="font-black text-lg">{weatherData?.temperature_c ? `${Math.round(weatherData.temperature_c)}°C` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rainfall</p>
                      <p className="font-black text-lg">{weatherData?.rainfall_mm ? `${weatherData.rainfall_mm}mm` : '0mm'}</p>
                    </div>
                  </div>
                  <p className="text-cyan-500 font-bold text-sm flex items-center gap-1">
                    {weatherData?.rainfall_mm && weatherData.rainfall_mm > 0 ? "Rain expected today" : "Clear skies expected"}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Crop Health Analytics */}
            <motion.div custom={6} variants={fadeUp} className="glass rounded-3xl p-6 border border-border/40">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-xl flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" /> Crop Health Trends
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Disease scans over the last 7 days</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-muted-foreground">High Risk Scans</p>
                  <p className={cn("font-black text-2xl", recentHighRisk > 0 ? "text-destructive" : "text-emerald-500")}>
                    {recentHighRisk}
                  </p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 500 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 12, fontWeight: 500 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }} 
                    />
                    <Area type="monotone" dataKey="scans" stroke="hsl(142, 76%, 36%)" fill="url(#colorHealth)" strokeWidth={3} activeDot={{ r: 6, fill: 'hsl(142, 76%, 36%)', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Regional Agriculture Reports */}
            <motion.div custom={7} variants={fadeUp} className="glass rounded-3xl p-6 border border-border/40">
              <h3 className="font-bold text-xl flex items-center gap-2 mb-6">
                <MapPin className="w-5 h-5 text-indigo-400" /> Regional Intelligence
              </h3>
              {isLoading ? (
                 <div className="animate-pulse space-y-4">
                   {[1,2,3].map(i => <div key={i} className="h-20 bg-muted/50 rounded-2xl w-full" />)}
                 </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {regionalReports.map(report => (
                    <div key={report.id} className="p-4 rounded-2xl bg-accent/30 border border-border/40 hover:bg-accent/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          report.severity === 'critical' ? "bg-destructive/20 text-destructive" :
                          report.severity === 'high' ? "bg-warning/20 text-warning" :
                          report.severity === 'medium' ? "bg-blue-500/20 text-blue-400" :
                          "bg-emerald-500/20 text-emerald-500"
                        )}>
                          {report.type}
                        </span>
                        <span className="text-xs text-muted-foreground">{report.region}</span>
                      </div>
                      <h4 className="font-bold text-sm mb-1 line-clamp-1">{report.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{report.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Market Prices */}
            <motion.div custom={5} variants={fadeUp} className="glass rounded-3xl p-6 border border-border/40">
              <h3 className="font-bold text-xl flex items-center gap-2 mb-6">
                <DollarSign className="w-5 h-5 text-amber-500" /> Live Mandi Prices
              </h3>
              {isLoading ? (
                 <div className="animate-pulse space-y-4">
                   {[1,2,3].map(i => <div key={i} className="h-12 bg-muted/50 rounded-xl w-full" />)}
                 </div>
              ) : (
                <div className="space-y-4">
                  {marketPrices.slice(0, 4).map((market, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/40 transition-colors group">
                      <div>
                        <p className="font-bold text-sm group-hover:text-amber-500 transition-colors">{market.commodity}</p>
                        <p className="text-xs text-muted-foreground">{market.market}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black">₹{market.modal_price}</p>
                        <p className={cn("text-xs font-bold flex items-center justify-end gap-0.5", 
                          market.trend === 'up' ? "text-emerald-500" : 
                          market.trend === 'down' ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {market.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : market.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                          {market.trend !== 'stable' ? `${Math.abs(market.trend_percentage)}%` : 'Stable'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Recent Activity */}
            <motion.div custom={6} variants={fadeUp} className="glass rounded-3xl p-6 border border-border/40 flex flex-col h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" /> Recent Scans
                </h3>
                <Link to="/history" className="text-xs font-bold text-primary hover:underline">View All</Link>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {scanHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                     <ScanLine className="w-10 h-10 mb-2" />
                     <p className="text-sm font-medium">No scans recorded</p>
                  </div>
                ) : (
                  scanHistory.slice(0, 5).map(scan => (
                    <Link key={scan.id} to="/history" className="flex items-center gap-3 p-3 rounded-2xl bg-accent/30 hover:bg-accent/60 transition-all border border-transparent hover:border-primary/20 group">
                      <div className="w-12 h-12 rounded-xl bg-black/50 overflow-hidden relative shrink-0">
                        <img src={scan.imageUrl} alt="scan" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{scan.diseaseName}</p>
                        <p className="text-xs text-muted-foreground">{safeDate(scan.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className={cn("w-2 h-2 rounded-full shrink-0", 
                        scan.severity === 'critical' || scan.severity === 'high' ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.8)]" : 
                        scan.severity === 'medium' ? "bg-warning shadow-[0_0_8px_rgba(245,158,11,0.8)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                      )} />
                    </Link>
                  ))
                )}
              </div>
            </motion.div>

          </div>
        </div>

        {/* Agriculture News Feed */}
        <motion.div custom={8} variants={fadeUp} className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-2xl flex items-center gap-2">
              <Newspaper className="w-6 h-6 text-primary" /> Agri News Feed
            </h3>
          </div>
          
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="h-64 bg-muted/50 rounded-3xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {news.slice(0, 4).map((item, idx) => (
                <a key={idx} href={item.url} target="_blank" rel="noreferrer" className="group rounded-3xl overflow-hidden glass border border-border/40 hover:border-primary/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 flex flex-col h-full">
                  <div className="h-40 w-full bg-black/50 overflow-hidden relative">
                    <img src={item.urlToImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                      {item.category || 'News'}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h4 className="font-bold text-sm leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">{item.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1">{item.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[10px] font-semibold text-muted-foreground">{item.source.name}</span>
                      <span className="text-[10px] font-medium text-muted-foreground">{new Date(item.publishedAt).toLocaleDateString()}</span>
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
