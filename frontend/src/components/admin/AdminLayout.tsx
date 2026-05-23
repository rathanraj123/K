import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Users, Scan, BarChart3, Leaf, 
  Wifi, WifiOff, ShieldCheck, AlertTriangle, ArrowLeft
} from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface HealthData {
  overall: 'healthy' | 'degraded';
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected } = useAdminStore();

  const { data: healthData } = useQuery<HealthData>({
    queryKey: ['system-health-badge'],
    queryFn: async () => {
      return await api.get<HealthData>('/system/health');
    },
    refetchInterval: 15000,
  });

  const menuItems = [
    { path: '/admin', name: 'Overview', icon: LayoutDashboard },
    { path: '/admin/users', name: 'User Management', icon: Users },
    { path: '/admin/scans', name: 'Scan Monitoring', icon: Scan },
    { path: '/admin/analytics', name: 'Advanced Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex bg-[#0c120c] text-foreground relative overflow-hidden">
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-72 glass-strong border-r border-border/40 z-30 flex flex-col justify-between p-6">
        <div className="space-y-8">
          {/* Header/Logo */}
          <div className="flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/20 transition-all duration-300">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-base font-black tracking-tight">
                  Agri<span className="text-primary">Cosmo</span>
                </span>
                <span className="block text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Admin Console</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-3">Management</p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/35'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-primary/10 border-l-2 border-primary"
                      style={{ zIndex: -1 }}
                      transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Services Telemetry */}
        <div className="space-y-4 pt-6 border-t border-border/40">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3">Telemetry</p>
          
          <div className="space-y-2">
            {/* WebSocket connection status */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-accent/25 border border-border/35 text-xs">
              <span className="font-semibold text-muted-foreground">Live Telemetry</span>
              <span className={`inline-flex items-center gap-1.5 font-bold ${
                isConnected ? 'text-emerald-400' : 'text-red-400 animate-pulse'
              }`}>
                {isConnected ? (
                  <>
                    <Wifi className="w-3.5 h-3.5" />
                    CONNECTED
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 animate-pulse" />
                    OFFLINE
                  </>
                )}
              </span>
            </div>

            {/* Overall System Health Status */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-accent/25 border border-border/35 text-xs">
              <span className="font-semibold text-muted-foreground">System Health</span>
              <span className={`inline-flex items-center gap-1.5 font-bold ${
                healthData?.overall === 'healthy' ? 'text-emerald-400' : 'text-red-400 animate-pulse'
              }`}>
                {healthData?.overall === 'healthy' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    HEALTHY
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                    DEGRADED
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Return to App */}
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Main Application
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-72 min-h-screen flex flex-col relative z-10">
        <main className="flex-1 p-8 md:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
