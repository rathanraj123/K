import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, CheckCircle2, AlertTriangle, XCircle, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { safeDate } from '@/lib/utils';

const severityBadge = (s?: string) => {
  const sev = (s || '').toLowerCase();
  if (sev === 'low' || sev === 'none') return 'bg-success/10 text-success';
  if (sev === 'medium') return 'bg-warning/10 text-warning';
  if (sev === 'high' || sev === 'critical') return 'bg-destructive/10 text-destructive';
  return 'bg-secondary/10 text-secondary';
};

const statusIcon = (s: string) =>
  s === 'completed' ? <CheckCircle2 className="w-4 h-4 text-success" /> :
  s === 'processing' ? <ScanLine className="w-4 h-4 text-primary animate-pulse" /> :
  <XCircle className="w-4 h-4 text-destructive" />;

export default function AdminScansPage() {
  const [scans, setScans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const res = await api.get<any>('/analytics/scans');
        // Sometimes backend returns direct array, sometimes wraps in { data: [] }
        const scanData = Array.isArray(res) ? res : (res.data || []);
        setScans(scanData);
      } catch (error) {
        console.error('Failed to fetch admin scans:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchScans();
    const interval = setInterval(fetchScans, 10000);
    return () => clearInterval(interval);
  }, []);
  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Scan <span className="gradient-text">Monitoring</span>
        </h1>
        <p className="text-muted-foreground mt-1">Real-time scan tracking and quality monitoring.</p>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Scans Today', value: scans.filter(s => safeDate(s.time).toDateString() === safeDate().toDateString()).length.toString(), icon: ScanLine, color: 'text-primary bg-primary/10' },
          { label: 'Completed Scans', value: scans.filter(s => s.status === 'completed' || s.status === 'success').length.toString(), icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-400/10' },
          { label: 'In Progress', value: scans.filter(s => s.status === 'processing').length.toString(), icon: ScanLine, color: 'text-blue-400 bg-blue-400/10 animate-pulse' },
          { label: 'Failed Scans', value: scans.filter(s => s.status === 'failed' || s.status === 'error').length.toString(), icon: AlertTriangle, color: 'text-red-400 bg-red-400/10' },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-4 hover-lift border border-border/30">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${s.color}`}>
              <s.icon className="w-4.5 h-4.5" />
            </div>
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Dataset Upload */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }} 
        className="glass rounded-2xl p-6 mb-8 border border-border/35 hover:border-primary/25 transition-all duration-300"
      >
        <div className="flex items-center gap-3 mb-2.5">
          <Upload className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Upload Training Dataset</h3>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20 tracking-wider uppercase">Coming Soon</span>
        </div>
        <p className="text-sm text-muted-foreground">Upload new labeled datasets to retrain and improve crop disease classification accuracy.</p>
      </motion.div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden border border-border/30">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-accent/20">
                <th className="text-left p-4 font-bold text-muted-foreground w-16 text-center">Status</th>
                <th className="text-left p-4 font-bold text-muted-foreground">User</th>
                <th className="text-left p-4 font-bold text-muted-foreground">Crop & Disease</th>
                <th className="text-left p-4 font-bold text-muted-foreground">Confidence</th>
                <th className="text-left p-4 font-bold text-muted-foreground">Severity</th>
                <th className="text-right p-4 font-bold text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground font-semibold">
                    Fetching scan history...
                  </td>
                </tr>
              ) : scans.length > 0 ? (
                scans.map((s) => (
                  <tr key={s.id} className="border-b border-border/20 hover:bg-accent/25 transition-colors">
                    <td className="p-4 text-center">{statusIcon(s.status)}</td>
                    <td className="p-4 font-semibold text-foreground">{s.user}</td>
                    <td className="p-4 capitalize">{s.disease?.replace(/_/g, ' ')}</td>
                    <td className="p-4 font-bold text-primary">{s.confidence > 0 ? `${s.confidence}%` : '—'}</td>
                    <td className="p-4">
                      {s.status === 'completed' && (
                        <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-lg ${severityBadge(s.severity)}`}>
                          {s.severity}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right text-xs text-muted-foreground">
                      {safeDate(s.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground font-semibold">
                    No scans found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
