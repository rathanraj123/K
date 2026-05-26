import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { IntelligenceHeader } from '@/components/scientist/IntelligenceHeader';
import { AlertsCenter } from '@/components/scientist/AlertsCenter';
import { GISHeatmaps } from '@/components/scientist/GISHeatmaps';
import { ClimateCenter } from '@/components/scientist/ClimateCenter';
import { OutbreakMonitor } from '@/components/scientist/OutbreakMonitor';
import { AIForecasting } from '@/components/scientist/AIForecasting';
import { EnvironmentalAnalytics } from '@/components/scientist/EnvironmentalAnalytics';
import { GlobalOverview } from '@/components/scientist/GlobalOverview';
import { ResearchFeed } from '@/components/scientist/ResearchFeed';
import { DatasetIntelligence } from '@/components/scientist/DatasetIntelligence';
import { AIModelAnalytics } from '@/components/scientist/AIModelAnalytics';
import { RealTimeMonitor } from '@/components/scientist/RealTimeMonitor';
import { CollaborationWorkspace } from '@/components/scientist/CollaborationWorkspace';
import { ExperimentalAnalysis } from '@/components/scientist/ExperimentalAnalysis';
import { AIResearchAssistant } from '@/components/scientist/AIResearchAssistant';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function ScientistDashboard() {
  const token = useAppStore(s => s.token);
  const fetchHistory = useAppStore(s => s.fetchHistory);

  useEffect(() => {
    if (token) {
      fetchHistory();
    }
  }, [fetchHistory, token]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-cyan-500/30">
      <IntelligenceHeader />

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-6 relative z-10">
        
        {/* Phase 1: Core Layout & Critical Monitoring */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-3">
             {/* Main GIS Map takes up prominent space */}
             <div className="h-[500px]">
               <GISHeatmaps />
             </div>
          </motion.div>
          
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1 space-y-6">
             <AlertsCenter />
             <OutbreakMonitor />
          </motion.div>
        </div>

        {/* Phase 2: Analytics & Forecasting */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1">
             <ClimateCenter />
          </motion.div>
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1">
             <EnvironmentalAnalytics />
          </motion.div>
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1">
             <AIForecasting />
          </motion.div>
        </div>

        {/* Phase 3: Research & Dataset Intelligence */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1">
             <GlobalOverview />
          </motion.div>
          <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1">
             <DatasetIntelligence />
          </motion.div>
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1">
             <AIModelAnalytics />
          </motion.div>
          <motion.div custom={8} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1 h-[400px]">
             <ResearchFeed />
          </motion.div>
        </div>


        {/* Phase 4: Collaboration & Live Systems */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pb-20">
          <motion.div custom={9} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1 h-[400px]">
             <RealTimeMonitor />
          </motion.div>
          <motion.div custom={10} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1 h-[400px]">
             <CollaborationWorkspace />
          </motion.div>
          <motion.div custom={11} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1 h-[400px]">
             <ExperimentalAnalysis />
          </motion.div>
          <motion.div custom={12} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1 h-[400px]">
             <AIResearchAssistant />
          </motion.div>
        </div>

      </div>
    </div>
  );
}
