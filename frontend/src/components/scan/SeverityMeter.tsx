import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

interface Props {
  severity: string;
  confidence: number;
}

const severityConfig: Record<string, { label: string; color: string; gradient: string; pct: number }> = {
  none:     { label: 'Healthy',  color: 'text-emerald-400', gradient: 'from-emerald-500 to-emerald-400', pct: 5 },
  low:      { label: 'Mild',     color: 'text-green-400',   gradient: 'from-green-500 to-emerald-400',   pct: 25 },
  medium:   { label: 'Moderate', color: 'text-amber-400',   gradient: 'from-amber-500 to-yellow-400',    pct: 55 },
  high:     { label: 'Severe',   color: 'text-orange-400',  gradient: 'from-orange-500 to-red-400',      pct: 80 },
  critical: { label: 'Critical', color: 'text-red-400',     gradient: 'from-red-600 to-red-400',         pct: 95 },
};

export default function SeverityMeter({ severity, confidence }: Props) {
  const config = severityConfig[severity.toLowerCase()] || severityConfig.medium;
  const fillPct = Math.min(Math.max(config.pct, 5), 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity className={`w-5 h-5 ${config.color}`} />
        <h3 className="font-bold text-lg">Severity Analysis</h3>
      </div>

      {/* Severity label and percentage */}
      <div className="flex items-baseline justify-between mb-3">
        <span className={`text-3xl font-extrabold ${config.color}`}>{config.label}</span>
        <span className={`text-2xl font-bold ${config.color}`}>{fillPct}%</span>
      </div>

      {/* Animated bar */}
      <div className="w-full h-4 rounded-full bg-muted/50 overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${config.gradient} relative`}
        >
          {/* Pulse effect on the edge */}
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute right-0 top-0 h-full w-3 rounded-full bg-white/30"
          />
        </motion.div>
      </div>

      {/* Scale labels */}
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>Mild</span>
        <span>Moderate</span>
        <span>Severe</span>
        <span>Critical</span>
      </div>

      {/* Estimation basis */}
      <div className="mt-4 pt-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          Estimated from: model confidence ({confidence.toFixed(0)}%), visual infection patterns, and disease classification rules.
        </p>
      </div>
    </motion.div>
  );
}
