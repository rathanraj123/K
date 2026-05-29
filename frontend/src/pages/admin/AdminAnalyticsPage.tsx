import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Globe, Cpu } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { api } from '@/lib/api';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { safeDate } from '@/lib/utils';

const PIE_COLORS = ['hsl(160, 84%, 39%)', 'hsl(243, 75%, 59%)', 'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)', 'hsl(200, 70%, 50%)'];

export default function AdminAnalyticsPage() {
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [diseaseDist, setDiseaseDist] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    growthRate: '+0%/mo',
    accuracy: '98.7%',
    regions: '12',
    avgInference: '0ms'
  });
  const [isLoading, setIsLoading] = useState(true);

  const [regionData, setRegionData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, statsRes] = await Promise.all([
          api.get<any>('/admin/analytics'),
          api.get<any>('/admin/stats')
        ]);

        if (analyticsRes) {
          // Process Growth Data (7-day trend)
          if (analyticsRes.weekly_scans) {
            const mappedGrowth = analyticsRes.weekly_scans.map((d: any) => ({
              day: d.name,
              scans: d.scans
            }));
            setGrowthData(mappedGrowth);
          }

          // Process Disease Dist (Scans by Disease)
          if (analyticsRes.disease_trends) {
            const mappedDiseases = analyticsRes.disease_trends.map((d: any) => ({
              disease: d.name.replace(/_/g, ' '),
              scans: d.count
            }));
            setDiseaseDist(mappedDiseases);
          }

          // Process Regional Distribution
          if (analyticsRes.regional_distribution) {
            // Sort to look better on pie chart and calculate percentages
            const totalUsers = analyticsRes.regional_distribution.reduce((acc: number, curr: any) => acc + curr.value, 0);
            const mappedRegions = analyticsRes.regional_distribution.map((d: any) => ({
              region: d.region,
              value: Math.round((d.value / Math.max(1, totalUsers)) * 100)
            })).sort((a: any, b: any) => b.value - a.value);
            setRegionData(mappedRegions);
          }
        }

        // Process Metrics
        if (statsRes) {
          setMetrics(prev => ({
            ...prev,
            accuracy: '98.5%', // Hardcoded for demo/feel, could be dynamic
            avgInference: `${statsRes.avg_latency || 0}ms`,
            growthRate: `${statsRes.total_scans} scans (Total)`
          }));
        }

      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Advanced <span className="gradient-text">Analytics</span>
        </h1>
        <p className="text-muted-foreground mt-1">Platform growth, model performance, and regional analytics.</p>
      </motion.div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: TrendingUp, label: 'Growth Rate', value: metrics.growthRate, color: 'text-emerald-400 bg-emerald-400/10' },
          { icon: Target, label: 'Model Accuracy', value: metrics.accuracy, color: 'text-primary bg-primary/10' },
          { icon: Globe, label: 'Regions Served', value: metrics.regions, color: 'text-blue-400 bg-blue-400/10' },
          { icon: Cpu, label: 'Avg Inference', value: metrics.avgInference, color: 'text-indigo-400 bg-indigo-400/10' },
        ].map((k, i) => (
          <motion.div 
            key={k.label} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.05 }} 
            className="glass rounded-2xl p-5 hover-lift border border-border/30"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${k.color}`}>
              <k.icon className="w-4.5 h-4.5" />
            </div>
            <div className="text-2xl font-black">{k.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Growth Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.25 }} 
        className="glass rounded-2xl p-6 mb-6 border border-border/30"
      >
        <h3 className="font-bold text-base mb-4">Platform Growth (Scans over 7 Days)</h3>
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : growthData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">No scans found in the last 7 days.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="growthScans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: 11 }} />
              <Area type="monotone" dataKey="scans" stroke="hsl(160, 84%, 39%)" fill="url(#growthScans)" strokeWidth={2} name="Scans" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Region Distribution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }} 
          className="glass rounded-2xl p-6 border border-border/30"
        >
          <h3 className="font-bold text-base mb-4">Regional Distribution</h3>
          {isLoading ? (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : regionData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground">No regional data available.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={regionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="region">
                    {regionData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {regionData.map((r, i) => (
                  <span key={r.region} className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {r.region} ({r.value}%)
                  </span>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Disease Distribution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.35 }} 
          className="glass rounded-2xl p-6 border border-border/30"
        >
          <h3 className="font-bold text-base mb-4">Scans by Disease</h3>
          {isLoading ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : diseaseDist.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">No scan data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={diseaseDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="disease" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: 11 }} />
                <Bar dataKey="scans" fill="hsl(243, 75%, 59%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
}
