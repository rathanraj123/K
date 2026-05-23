import { motion } from 'framer-motion';
import { Camera, AlertTriangle, CheckCircle2, type LucideIcon } from 'lucide-react';
import type { ImageQuality } from '@/store/useAppStore';

interface Props {
  data?: ImageQuality;
}

const gradeConfig: Record<string, { color: string; icon: LucideIcon; label: string }> = {
  excellent: { color: 'text-emerald-400', icon: CheckCircle2, label: 'Excellent Quality' },
  good:      { color: 'text-green-400',   icon: CheckCircle2, label: 'Good Quality' },
  fair:      { color: 'text-amber-400',   icon: AlertTriangle, label: 'Fair Quality' },
  poor:      { color: 'text-red-400',     icon: AlertTriangle, label: 'Poor Quality' },
};

const metricLabels: Record<string, string> = {
  sharpness: 'Sharpness',
  brightness: 'Brightness',
  contrast: 'Contrast',
  leaf_coverage: 'Leaf Coverage',
  shadow_free: 'Shadow Free',
  exposure: 'Exposure',
  centering: 'Centering',
  background_clean: 'Background',
};

export default function ImageQualityPanel({ data }: Props) {
  if (!data || data.scan_quality_score === 0) return null;

  const grade = gradeConfig[data.quality_grade] || gradeConfig.fair;
  const GradeIcon = grade.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Image Quality</h3>
        </div>
        <div className={`flex items-center gap-1.5 ${grade.color}`}>
          <GradeIcon className="w-4 h-4" />
          <span className="text-sm font-bold">{data.scan_quality_score}/100</span>
        </div>
      </div>

      {/* Component scores */}
      {data.component_scores && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {Object.entries(data.component_scores).map(([key, value]) => (
            <div key={key} className="p-2 rounded-lg bg-accent/30 text-center">
              <div className="text-lg font-bold tabular-nums">{Math.round(value)}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {metricLabels[key] || key}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Retake suggestions */}
      {data.retake_suggestions && data.retake_suggestions.length > 0 && (
        <div className={`rounded-xl p-3 ${data.needs_retake ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
          <p className={`text-xs font-bold mb-1.5 ${data.needs_retake ? 'text-red-400' : 'text-amber-400'}`}>
            {data.needs_retake ? '⚠️ Retake Recommended' : '💡 Tips for Better Results'}
          </p>
          <ul className="space-y-1">
            {data.retake_suggestions.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
