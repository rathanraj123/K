import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, Server, Database, Zap, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'no_workers' | string;
  latency_ms?: number;
  active_workers?: number;
  error?: string;
}

interface HealthData {
  timestamp: number;
  overall: 'healthy' | 'degraded';
  services: {
    postgres?: ServiceHealth;
    redis?: ServiceHealth;
    celery?: ServiceHealth;
    elasticsearch?: ServiceHealth;
  };
}

const SERVICE_ICONS = {
  postgres:      Database,
  redis:         Zap,
  celery:        RefreshCw,
  elasticsearch: Server,
};

const statusColor = (status: string) =>
  status === 'healthy' || status === 'green'
    ? 'text-emerald-400'
    : status === 'no_workers' || status === 'yellow'
    ? 'text-amber-400'
    : 'text-red-400';

const statusBg = (status: string) =>
  status === 'healthy' || status === 'green'
    ? 'bg-emerald-400/10'
    : status === 'no_workers' || status === 'yellow'
    ? 'bg-amber-400/10'
    : 'bg-red-400/10';

export function SystemHealthPanel() {
  const { data, isLoading, refetch } = useQuery<HealthData>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await api.get<HealthData>('/system/health');
      return res;
    },
    refetchInterval: 15000, // auto-refresh every 15s
  });

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-bold">System Health</h3>
        </div>
        <button
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-accent/20 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Overall badge */}
          <div className={`mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            data?.overall === 'healthy'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-red-500/15 text-red-400'
          }`}>
            {data?.overall === 'healthy'
              ? <CheckCircle className="w-3.5 h-3.5" />
              : <AlertTriangle className="w-3.5 h-3.5" />}
            Overall: {data?.overall?.toUpperCase() ?? 'UNKNOWN'}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(data?.services ?? {}).map(([name, svc]) => {
              const Icon = SERVICE_ICONS[name as keyof typeof SERVICE_ICONS] ?? Server;
              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-xl p-3 flex items-start gap-3 ${statusBg(svc.status)}`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${statusColor(svc.status)}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold capitalize">{name}</p>
                    <p className={`text-[10px] font-semibold ${statusColor(svc.status)}`}>
                      {svc.status.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    {svc.latency_ms !== undefined && (
                      <p className="text-[10px] text-muted-foreground">{svc.latency_ms}ms</p>
                    )}
                    {svc.active_workers !== undefined && (
                      <p className="text-[10px] text-muted-foreground">{svc.active_workers} workers</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground mt-3 text-right">
            Last checked: {data?.timestamp ? new Date(data.timestamp * 1000).toLocaleTimeString() : '—'}
          </p>
        </>
      )}
    </div>
  );
}
