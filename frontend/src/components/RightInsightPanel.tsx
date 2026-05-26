import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target, Beaker, MapPin, AlertTriangle, CloudRain, ShieldCheck, Leaf, Calendar, Thermometer } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn, safeDate } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export default function RightInsightPanel({ className }: { className?: string }) {
  const { activeScanContext } = useAppStore();

  const getSeverityBg = (severity: string) => {
    if (severity === 'critical') return 'bg-red-500/10 border-red-500/20 text-red-500';
    if (severity === 'high') return 'bg-red-500/10 border-red-500/20 text-red-500';
    if (severity === 'medium') return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
    return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
  };

  return (
    <div className={cn("flex flex-col h-full bg-card/40 backdrop-blur-3xl border-l border-border/30 relative shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.2)]", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent pointer-events-none opacity-30" />
      
      <div className="p-5 border-b border-border/30 flex items-center justify-between bg-background/20 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-500" />
          <h3 className="font-bold text-xs uppercase tracking-widest text-foreground/80">Crop Context</h3>
        </div>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="p-5 space-y-6">
          {activeScanContext ? (
            <>
              {/* Scanned Image Preview */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl overflow-hidden bg-black border border-border/50 relative group"
              >
                <img src={activeScanContext.imageUrl} alt="crop" className="w-full h-40 object-cover opacity-80" />
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className={cn("text-[10px] uppercase font-black px-2 py-0.5 backdrop-blur-md", getSeverityBg(activeScanContext.severity))}>
                    {activeScanContext.severity} Risk
                  </Badge>
                </div>
              </motion.div>

              {/* Disease Info */}
              <section className="space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Diagnosis</h4>
                <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
                  <h3 className="font-black text-xl mb-1">{activeScanContext.diseaseName.replace(/_/g, ' ')}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {activeScanContext.cropType && (
                      <span className="flex items-center gap-1 text-xs font-semibold bg-accent px-2 py-1 rounded-md">
                        <Leaf className="w-3 h-3" /> {activeScanContext.cropType}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs font-semibold bg-accent px-2 py-1 rounded-md">
                      <Calendar className="w-3 h-3" /> {safeDate(activeScanContext.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </section>

              {/* Treatment Summary */}
              {activeScanContext.farmerReport && (
                <section className="space-y-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recommended Treatment</h4>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 shadow-sm">
                    <p className="text-sm font-semibold text-primary mb-2">
                      {activeScanContext.farmerReport.treatment_plan?.recommended_product || 'General Fungicide'}
                    </p>
                    <p className="text-xs text-foreground/80 mb-2">
                      Dosage: {activeScanContext.farmerReport.treatment_plan?.dosage || 'Follow label instructions'}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                      {activeScanContext.farmerReport.agronomist_summary}
                    </p>
                  </div>
                </section>
              )}

              {/* Environmental Vectors */}
              <section className="space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Environmental Factors</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-card border border-border/50 flex flex-col items-center text-center shadow-sm">
                    <CloudRain className="w-5 h-5 text-blue-500 mb-1" />
                    <span className="text-[10px] font-bold">Rain Expected</span>
                  </div>
                  <div className="p-3 rounded-xl bg-card border border-border/50 flex flex-col items-center text-center shadow-sm">
                    <Thermometer className="w-5 h-5 text-amber-500 mb-1" />
                    <span className="text-[10px] font-bold">High Humidity</span>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="p-6 rounded-3xl bg-card/50 border border-border/30 text-center border-dashed mt-10">
              <ShieldCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold mb-1">No Active Scan</p>
              <p className="text-xs text-muted-foreground">Upload a crop image to start an intelligent consultation.</p>
            </div>
          )}
          
          <div className="pb-8"></div>
        </div>
      </ScrollArea>
    </div>
  );
}
