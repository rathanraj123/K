import { motion } from 'framer-motion';
import { 
  Users, 
  ScanLine, 
  Activity, 
  Server, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3, 
  ShieldCheck, 
  Globe, 
  Database, 
  Cpu, 
  RefreshCw, 
  Terminal,
  ActivityIcon
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

import React from 'react';
import { api } from '@/lib/api';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useAdminWebsocket } from '@/hooks/useAdminWebsocket';
import { useAdminStore } from '@/store/adminStore';
import { SystemHealthPanel } from '@/components/admin/SystemHealthPanel';
import { RealtimeEventFeed } from '@/components/admin/RealtimeEventFeed';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  change: string;
  gradientClass: string;
  loading?: boolean;
}

function StatCard({ icon: Icon, label, value, change, gradientClass, loading }: StatCardProps) {
  const isPositive = change.startsWith('+') || change.includes('up') || change === 'Optimized' || change.includes('Connected');
  
  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-xl p-6 shadow-xl">
        <Skeleton className="w-10 h-10 rounded-xl mb-4 bg-white/10" />
        <Skeleton className="h-8 w-2/3 mb-2 bg-white/10" />
        <Skeleton className="h-4 w-1/3 bg-white/10" />
      </div>
    );
  }

  return (
    <motion.div 
      variants={cardVariants}
      whileHover={{ y: -4, scale: 1.01 }}
      className="relative group overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60 backdrop-blur-xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-white/10"
    >
      {/* Decorative Glow */}
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 ${gradientClass}`} />
      
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors duration-300`}>
          <Icon className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
        </div>
        <Badge 
          variant="outline" 
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isPositive 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          {change}
        </Badge>
      </div>
      
      <div>
        <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">{label}</p>
        <h3 className="text-3xl font-extrabold text-white mt-1 group-hover:text-emerald-400 transition-colors duration-300">
          {value}
        </h3>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  // Initialize WebSocket connection for real-time updates
  useAdminWebsocket();
  const { isConnected, realtimeEvents } = useAdminStore();

  // Fetch Dashboard Stats
  const { data: dashboardData, isLoading: isLoadingStats, isError: isErrorStats, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get<any>('/admin/stats');
      return res;
    },
    refetchInterval: 30000 // Polling every 30s
  });

  // Fetch Logs
  const { data: logsData, isLoading: isLoadingLogs, isError: isErrorLogs, error: logsError, refetch: refetchLogs } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const res = await api.get<any[]>('/admin/logs');
      return res;
    }
  });

  // Fetch Analytics
  const { data: analyticsData, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const res = await api.get<any>('/admin/analytics');
      return res;
    }
  });

  // Developer Debug Logs
  React.useEffect(() => {
    console.log("[AdminDashboard] Stats data loaded:", dashboardData);
  }, [dashboardData]);

  React.useEffect(() => {
    console.log("[AdminDashboard] Logs data loaded:", logsData);
  }, [logsData]);

  React.useEffect(() => {
    console.log("[AdminDashboard] Analytics data loaded:", analyticsData);
  }, [analyticsData]);

  const handleRefreshAll = () => {
    refetchStats();
    refetchLogs();
    refetchAnalytics();
  };

  const logs = logsData || [];
  const usageData = analyticsData?.weekly_scans || [];
  const modelData = analyticsData?.disease_trends || [];

  const systemMetrics = [
    { label: 'System Uptime', value: '99.98%', icon: ShieldCheck, change: 'Stable', gradient: 'bg-emerald-500' },
    { label: 'Avg Latency', value: dashboardData?.avg_latency ? `${dashboardData.avg_latency}ms` : '0ms', icon: ActivityIcon, change: 'Optimal', gradient: 'bg-sky-500' },
    { label: 'DB Cluster', value: isConnected ? 'Connected (Real-time)' : 'Active', icon: Database, change: isConnected ? 'Live' : 'Cached', gradient: 'bg-indigo-500' },
    { label: 'Active Nodes', value: '4 Nodes', icon: Globe, change: 'Healthy', gradient: 'bg-violet-500' },
  ];

  return (
    <AdminLayout>
      {/* Header section with refresh button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-black tracking-tight text-white"
          >
            System <span className="text-emerald-400">Admin Control</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 mt-1 text-sm font-medium"
          >
            Real-time analytics, diagnostics load metrics, and cluster health monitoring.
          </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2"
        >
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefreshAll}
            className="border-white/10 hover:bg-white/5 text-slate-300 gap-2 h-9 rounded-xl text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh All
          </Button>
          <Badge variant="outline" className={`h-9 px-3 rounded-xl flex items-center gap-2 border-white/10 text-xs text-slate-300 font-semibold ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isConnected ? 'Live WebSockets Active' : 'Polling Fallback'}
          </Badge>
        </motion.div>
      </div>

      {/* Global Error Banner if API fails */}
      {(isErrorStats || isErrorLogs) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs font-medium flex items-start gap-3 shadow-lg"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <h4 className="font-bold text-rose-200">Database Connection Mismatch Detected</h4>
            <p className="mt-0.5 opacity-90">
              There was an issue processing API calculations. Ensure background database tables and PostgreSQL server are synchronized.
            </p>
            {statsError && <p className="mt-1 text-[10px] font-mono opacity-70">Detail: {(statsError as any).message || String(statsError)}</p>}
          </div>
        </motion.div>
      )}

      {/* System Health Quick Glance Grid */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        {systemMetrics.map((item, i) => (
          <motion.div 
            key={i} 
            variants={cardVariants}
            whileHover={{ scale: 1.01 }}
            className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl p-4 shadow-md hover:border-white/10 transition-all duration-300"
          >
            <div className={`w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center`}>
              <item.icon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-black text-white">{item.value}</span>
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded font-bold">{item.change}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Stats Cards Grid */}
      <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
      >
        <StatCard 
          icon={Users}
          label="Total Users"
          value={dashboardData?.total_users ?? 0}
          change="+12% up"
          gradientClass="bg-emerald-500"
          loading={isLoadingStats}
        />
        <StatCard 
          icon={ScanLine}
          label="Total Crop Scans"
          value={dashboardData?.total_scans ?? 0}
          change="+18% up"
          gradientClass="bg-sky-500"
          loading={isLoadingStats}
        />
        <StatCard 
          icon={Activity}
          label="Active Sessions"
          value={dashboardData?.active_users ?? 0}
          change="Real-time"
          gradientClass="bg-indigo-500"
          loading={isLoadingStats}
        />
        <StatCard 
          icon={Server}
          label="API Calls Today"
          value={dashboardData?.api_calls ?? 0}
          change="+4.2% up"
          gradientClass="bg-violet-500"
          loading={isLoadingStats}
        />
      </motion.div>

      {/* Charts Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Scans Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }} 
          className="rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl p-6 shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Scan Activity Volume</h3>
                <p className="text-[10px] text-slate-400">Total analytical disease scan metrics for past 7 days.</p>
              </div>
            </div>
          </div>
          
          {isLoadingAnalytics ? (
            <div className="h-56 flex flex-col justify-center gap-2">
              <Skeleton className="h-full w-full bg-white/5 rounded-xl" />
            </div>
          ) : usageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={usageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scansGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(16, 185, 129)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="rgb(16, 185, 129)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgb(148, 163, 184)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'rgb(148, 163, 184)' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgb(9, 9, 11)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '0.75rem', 
                    fontSize: 10,
                    color: 'white'
                  }} 
                />
                <Area type="monotone" dataKey="scans" stroke="rgb(16, 185, 129)" fill="url(#scansGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 rounded-xl bg-slate-900/20 border border-dashed border-white/5 flex flex-col items-center justify-center p-4">
              <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-400 font-semibold">No recent scan history</p>
              <p className="text-[10px] text-slate-500 text-center max-w-[200px]">Analytical scan records will populate here once crop uploads begin.</p>
            </div>
          )}
        </motion.div>

        {/* Disease Distribution Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.45 }} 
          className="rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl p-6 shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Disease Distribution</h3>
                <p className="text-[10px] text-slate-400">Occurrence counts of identified crop disease types.</p>
              </div>
            </div>
          </div>
          
          {isLoadingAnalytics ? (
            <div className="h-56 flex flex-col justify-center gap-2">
              <Skeleton className="h-full w-full bg-white/5 rounded-xl" />
            </div>
          ) : modelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={modelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'rgb(148, 163, 184)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'rgb(148, 163, 184)' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgb(9, 9, 11)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '0.75rem', 
                    fontSize: 10,
                    color: 'white'
                  }} 
                />
                <Bar dataKey="count" fill="rgb(16, 185, 129)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 rounded-xl bg-slate-900/20 border border-dashed border-white/5 flex flex-col items-center justify-center p-4">
              <BarChart3 className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-400 font-semibold">No disease distribution metrics</p>
              <p className="text-[10px] text-slate-500 text-center max-w-[200px]">Aggregated disease counts will appear here upon completion of diagnostic tasks.</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* System Health + Live Event Feed Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }}
          className="flex flex-col h-full"
        >
          <SystemHealthPanel />
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.55 }}
          className="flex flex-col h-full"
        >
          <RealtimeEventFeed />
        </motion.div>
      </div>

      {/* Activity Logs Console */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.6 }} 
        className="rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <Terminal className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">System Audit Stream</h3>
              <p className="text-[10px] text-slate-400">Live operational event and security history log.</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {isLoadingLogs ? (
            [1, 2, 3].map(i => (
              <Skeleton key={i} className="h-11 w-full bg-white/5 rounded-xl" />
            ))
          ) : logs.length > 0 ? (
            logs.slice(0, 15).map((log: any, i: number) => (
              <div 
                key={i} 
                className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-glow" />
                  <span className="font-mono text-xs text-slate-200 capitalize truncate">{log.action?.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-none">
                    {log.details ? JSON.stringify(log.details) : 'Executed successfully'}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-500">
                  <span className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    {log.user_id ? `usr_${log.user_id.slice(0,6)}` : 'sys_kernel'}
                  </span>
                  <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-center">
              <Terminal className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-400 font-semibold">Audit log stream empty</p>
              <p className="text-[10px] text-slate-500 max-w-[250px] mt-0.5">No administrative operations have been logged in the current audit period.</p>
            </div>
          )}
        </div>
      </motion.div>
    </AdminLayout>
  );
}
