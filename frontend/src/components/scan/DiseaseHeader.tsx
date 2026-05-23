import { motion } from 'framer-motion';
import { Shield, Bug, Leaf, AlertTriangle, Radio, type LucideIcon } from 'lucide-react';
import type { DiseaseIdentity } from '@/store/useAppStore';

interface Props {
  diseaseName: string;
  diseaseIdentity?: DiseaseIdentity;
  severity: string;
  confidence: number;
}

const categoryIcon: Record<string, LucideIcon> = {
  fungal: Bug,
  bacterial: Bug,
  viral: Shield,
  pest: AlertTriangle,
  none: Leaf,
};

const categoryColor: Record<string, string> = {
  fungal: 'text-amber-400',
  bacterial: 'text-red-400',
  viral: 'text-purple-400',
  pest: 'text-orange-400',
  none: 'text-emerald-400',
};

const riskColor: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  none: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export default function DiseaseHeader({ diseaseName, diseaseIdentity, severity, confidence }: Props) {
  const di = diseaseIdentity;
  const displayName = di?.display_name || diseaseName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const category = di?.disease_category || 'fungal';
  const Icon = categoryIcon[category] || Bug;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-2xl p-6"
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Disease Info */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-accent/50 ${categoryColor[category]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">{displayName}</h2>
              {di?.scientific_name && di.scientific_name !== 'N/A' && (
                <p className="text-sm text-muted-foreground italic">{di.scientific_name}</p>
              )}
            </div>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            {di?.disease_category && di.disease_category !== 'none' && (
              <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium capitalize ${riskColor[di.spread_risk] || riskColor.moderate}`}>
                {di.disease_category}
              </span>
            )}
            {di?.crop_stage_affected && di.crop_stage_affected !== 'N/A' && (
              <span className="text-xs px-2.5 py-1 rounded-lg border border-border/50 bg-accent/30 text-muted-foreground font-medium">
                Stage: {di.crop_stage_affected}
              </span>
            )}
            {di?.contagiousness && di.contagiousness !== 'N/A' && (
              <span className="text-xs px-2.5 py-1 rounded-lg border border-border/50 bg-accent/30 text-muted-foreground font-medium flex items-center gap-1">
                <Radio className="w-3 h-3" />
                {di.contagiousness}
              </span>
            )}
          </div>
        </div>

        {/* Severity + Risk badges */}
        <div className="flex flex-col items-end gap-2">
          <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${riskColor[severity.toLowerCase()] || riskColor.moderate}`}>
            {severity.toUpperCase()} SEVERITY
          </div>
          {di?.spread_risk && di.spread_risk !== 'none' && (
            <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${riskColor[di.spread_risk] || riskColor.moderate}`}>
              Spread Risk: {di.spread_risk.toUpperCase()}
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            Confidence: {confidence.toFixed(1)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
