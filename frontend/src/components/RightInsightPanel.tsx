import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target, Beaker, GitBranch, AlertTriangle, CloudRain, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn, safeDate } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const getSeverityColor = (confidence: number) => {
  if (confidence > 85) return 'text-destructive stroke-destructive';
  if (confidence > 60) return 'text-warning stroke-warning';
  return 'text-success stroke-success';
};

const getSeverityBg = (confidence: number) => {
  if (confidence > 85) return 'bg-destructive/10 border-destructive/20 text-destructive';
  if (confidence > 60) return 'bg-warning/10 border-warning/20 text-warning-foreground';
  return 'bg-success/10 border-success/20 text-success';
};

export default function RightInsightPanel({ className }: { className?: string }) {
  const { currentScan } = useAppStore();

  const mockTaxonomy = currentScan?.diseaseName ? [
    { level: 'Kingdom', name: 'Fungi' },
    { level: 'Phylum', name: 'Ascomycota' },
    { level: 'Class', name: 'Dothideomycetes' },
    { level: 'Genus', name: currentScan.diseaseName.split('_')[0] || 'Alternaria' },
  ] : [];

  return (
    <div className={cn("flex flex-col h-full bg-card/40 backdrop-blur-3xl border-l border-border/30 relative shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.2)]", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent pointer-events-none opacity-30" />
      
      <div className="p-5 border-b border-border/30 flex items-center justify-between bg-background/20 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-xs uppercase tracking-widest text-foreground/80">Intelligence Panel</h3>
        </div>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="p-5 space-y-8">
          {/* Severity Gauge */}
          <section>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Risk Assessment</h4>
            {currentScan ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex flex-col items-center p-6 rounded-3xl bg-card border border-border/50 shadow-sm"
              >
                {/* Custom SVG Radial Gauge */}
                <div className="relative w-32 h-32 mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" className="fill-none stroke-muted stroke-[8]" />
                    <circle 
                      cx="50" cy="50" r="40" 
                      className={cn("fill-none stroke-[8] transition-all duration-1000 ease-out", getSeverityColor(currentScan.confidence || 0))} 
                      strokeDasharray="251.2" 
                      strokeDashoffset={251.2 - (251.2 * (currentScan.confidence || 0)) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold tracking-tighter">
                      {Math.round(currentScan.confidence || 0)}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Confidence</span>
                  </div>
                </div>
                
                <Badge variant="outline" className={cn("mt-2 px-3 py-1 text-[10px] uppercase tracking-wider font-bold", getSeverityBg(currentScan.confidence || 0))}>
                  {(currentScan.confidence || 0) > 85 ? 'Critical Pathogen' : 'Monitoring Recommended'}
                </Badge>
              </motion.div>
            ) : (
              <div className="p-6 rounded-3xl bg-card/50 border border-border/30 text-center border-dashed">
                <Target className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No active context.</p>
              </div>
            )}
          </section>

          {/* Taxonomy Tree */}
          {currentScan && (
            <section>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Taxonomy Profile</h4>
              <div className="p-5 rounded-3xl bg-card border border-border/50 shadow-sm">
                <div className="space-y-4 relative">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                  {mockTaxonomy.map((tax, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={i} 
                      className="flex items-center gap-4 relative z-10"
                    >
                      <div className="w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center shrink-0">
                        <GitBranch className="w-3 h-3 text-primary" />
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{tax.level}</p>
                        <p className="text-xs font-semibold">{tax.name}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Environmental Vectors */}
          <section>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Environmental Vectors</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-card border border-border/50 flex flex-col items-start shadow-sm">
                <CloudRain className="w-5 h-5 text-blue-500 mb-2" />
                <span className="text-xs font-bold">High Humidity</span>
                <span className="text-[9px] text-muted-foreground leading-tight mt-1">Accelerates fungal spore spread.</span>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border/50 flex flex-col items-start shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-500 mb-2" />
                <span className="text-xs font-bold">Heat Stress</span>
                <span className="text-[9px] text-muted-foreground leading-tight mt-1">Weakens crop immunity walls.</span>
              </div>
            </div>
          </section>
          
          <div className="pb-8"></div>
        </div>
      </ScrollArea>
    </div>
  );
}
