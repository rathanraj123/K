import { motion } from 'framer-motion';
import { Cloud, Droplets, Thermometer, CloudRain, AlertTriangle } from 'lucide-react';
import type { WeatherRisk } from '@/store/useAppStore';

interface Props {
  data?: WeatherRisk;
}

const riskColors: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  moderate: 'text-amber-400',
  low: 'text-emerald-400',
  none: 'text-emerald-400',
};

const riskBg: Record<string, string> = {
  critical: 'from-red-500/20 to-red-600/10',
  high: 'from-orange-500/20 to-orange-600/10',
  moderate: 'from-amber-500/20 to-amber-600/10',
  low: 'from-emerald-500/20 to-emerald-600/10',
  none: 'from-emerald-500/20 to-emerald-600/10',
};

export default function WeatherRiskCard({ data }: Props) {
  if (!data || !data.available) return null;

  const conditions = data.current_conditions;
  const risk = data.disease_risk;
  const riskLevel = risk?.risk_level || 'low';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-sky-400" />
          <h3 className="font-bold text-lg">Weather Risk Intelligence</h3>
        </div>
        {data.location && (
          <span className="text-xs text-muted-foreground">📍 {data.location}</span>
        )}
      </div>

      {/* Weather conditions grid */}
      {conditions && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-accent/30 text-center">
            <Thermometer className="w-4 h-4 mx-auto mb-1 text-orange-400" />
            <div className="text-lg font-bold">{conditions.temperature_c}°C</div>
            <div className="text-[10px] text-muted-foreground">Temperature</div>
          </div>
          <div className="p-3 rounded-xl bg-accent/30 text-center">
            <Droplets className="w-4 h-4 mx-auto mb-1 text-blue-400" />
            <div className="text-lg font-bold">{conditions.humidity_pct}%</div>
            <div className="text-[10px] text-muted-foreground">Humidity</div>
          </div>
          <div className="p-3 rounded-xl bg-accent/30 text-center">
            <CloudRain className="w-4 h-4 mx-auto mb-1 text-sky-400" />
            <div className="text-lg font-bold">{conditions.rainfall_mm}mm</div>
            <div className="text-[10px] text-muted-foreground">Rainfall</div>
          </div>
        </div>
      )}

      {/* Disease spread risk meter */}
      {risk && (
        <div className={`rounded-xl p-4 bg-gradient-to-r ${riskBg[riskLevel]} border border-border/20 mb-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Disease Spread Risk</span>
            <span className={`text-xl font-extrabold ${riskColors[riskLevel]}`}>
              {risk.fungal_spread_risk_pct.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${risk.fungal_spread_risk_pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${riskColors[riskLevel] === 'text-red-400' ? 'bg-red-500' : riskColors[riskLevel] === 'text-orange-400' ? 'bg-orange-500' : riskColors[riskLevel] === 'text-amber-400' ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
          </div>
        </div>
      )}

      {/* Correlations */}
      {data.correlations && data.correlations.length > 0 && (
        <div className="space-y-2">
          {data.correlations.map((c, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-400" />
              {c}
            </p>
          ))}
        </div>
      )}

      {/* Agricultural warnings */}
      {data.agri_warnings && data.agri_warnings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
          {data.agri_warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-400 font-medium">⚠️ {w}</p>
          ))}
        </div>
      )}
    </motion.div>
  );
}
