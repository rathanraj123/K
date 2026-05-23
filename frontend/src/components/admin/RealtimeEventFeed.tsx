import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminStore } from '@/store/adminStore';
import { Activity, AlertCircle, CheckCircle, Info, Zap, Wifi, WifiOff } from 'lucide-react';

const EVENT_ICONS: Record<string, React.ComponentType<any>> = {
  scan_upload:        Zap,
  analytics_update:  Activity,
  admin_notification: Info,
  default:            Activity,
};

const EVENT_COLORS: Record<string, string> = {
  scan_upload:        'text-emerald-400 bg-emerald-400/10',
  analytics_update:  'text-blue-400 bg-blue-400/10',
  admin_notification: 'text-amber-400 bg-amber-400/10',
  error:              'text-red-400 bg-red-400/10',
  default:            'text-slate-400 bg-slate-400/10',
};

export function RealtimeEventFeed() {
  const { realtimeEvents, isConnected, clearEvents } = useAdminStore();

  return (
    <div className="glass rounded-2xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-sm">Live Event Feed</h3>
          <span
            className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isConnected
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        {realtimeEvents.length > 0 && (
          <button
            onClick={clearEvents}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Scrollable event list */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-72 pr-1 scrollbar-thin scrollbar-thumb-accent">
        <AnimatePresence initial={false}>
          {realtimeEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <Activity className="w-8 h-8 opacity-30" />
              <p className="text-xs">Waiting for real-time events…</p>
            </div>
          ) : (
            realtimeEvents.map((event, i) => {
              const Icon = EVENT_ICONS[event.type] ?? EVENT_ICONS.default;
              const colorClass = EVENT_COLORS[event.type] ?? EVENT_COLORS.default;
              return (
                <motion.div
                  key={`${event.timestamp}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-accent/20 text-xs"
                >
                  <span className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate capitalize">
                      {event.type.replace(/_/g, ' ')}
                    </p>
                    {event.data?.message && (
                      <p className="text-muted-foreground truncate">{event.data.message}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
