import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { FlaskConical, Target, TrendingUp, AlertTriangle, MapPin, Activity } from 'lucide-react';

const comparisonData = [
  { metric: 'Growth Rate', 'Rice Blast': 85, 'Brown Spot': 65, fullMark: 100 },
  { metric: 'Severity Level', 'Rice Blast': 90, 'Brown Spot': 55, fullMark: 100 },
  { metric: 'Confidence Score', 'Rice Blast': 95, 'Brown Spot': 88, fullMark: 100 },
  { metric: 'Spread Velocity', 'Rice Blast': 70, 'Brown Spot': 40, fullMark: 100 },
  { metric: 'Crop Damage', 'Rice Blast': 80, 'Brown Spot': 60, fullMark: 100 },
];

const seasonalData = [
  { month: 'Jan', 'Rice Blast': 40, 'Brown Spot': 24 },
  { month: 'Feb', 'Rice Blast': 30, 'Brown Spot': 13 },
  { month: 'Mar', 'Rice Blast': 20, 'Brown Spot': 58 },
  { month: 'Apr', 'Rice Blast': 27, 'Brown Spot': 39 },
  { month: 'May', 'Rice Blast': 18, 'Brown Spot': 48 },
  { month: 'Jun', 'Rice Blast': 23, 'Brown Spot': 38 },
];

export default function ResearchAnalyticsPage() {
  const isDark = useAppStore(s => s.isDark);
  const theme = {
    card: isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200',
    text: isDark ? 'text-white' : 'text-slate-900',
    subText: isDark ? 'text-slate-400' : 'text-slate-500',
    glowBorder: isDark ? 'border hover:border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.05)] transition-all' : 'shadow-sm',
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'} pt-20 selection:bg-cyan-500/30 overflow-hidden`}>
      {/* Dynamic Background */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-6 py-8 relative z-10 h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
          
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4">
            <div>
              <h1 className={`text-4xl font-extrabold ${theme.text} tracking-tight mb-2 flex items-center gap-3`}>
                <FlaskConical className="w-8 h-8 text-cyan-400" /> Research Analytics Hub
              </h1>
              <p className={theme.subText}>
                Deep-dive comparative analysis and long-term epidemiological patterns
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors">Export PDF</button>
              <button className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors">Export CSV</button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Disease Comparison Dashboard */}
            <motion.div variants={itemVariants} className={`p-6 rounded-2xl ${theme.card} ${theme.glowBorder} flex flex-col min-h-[400px]`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-xl font-bold ${theme.text} mb-1`}>Disease Comparison Profile</h3>
                  <p className={`text-sm ${theme.subText}`}>Multidimensional analysis between pathogens</p>
                </div>
                <div className="flex gap-2">
                  <select className="bg-slate-900 border border-slate-700 text-sm text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-cyan-500 transition-colors">
                    <option>Rice Blast</option>
                    <option>Leaf Blight</option>
                  </select>
                  <span className="text-slate-500 py-1.5">vs</span>
                  <select className="bg-slate-900 border border-slate-700 text-sm text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-cyan-500 transition-colors">
                    <option>Brown Spot</option>
                    <option>Healthy</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 flex flex-col md:flex-row gap-6 items-center justify-center">
                <div className="w-full md:w-1/2 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={comparisonData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Rice Blast" dataKey="Rice Blast" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.3} />
                      <Radar name="Brown Spot" dataKey="Brown Spot" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.3} />
                      <Legend />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="w-full md:w-1/2 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-rose-400" />
                      <span className="text-sm font-bold text-white">Faster Spreading</span>
                    </div>
                    <p className="text-xs text-slate-400">Rice Blast is exhibiting a 20% higher daily growth rate compared to Brown Spot in humid regions.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold text-white">Detection Confidence</span>
                    </div>
                    <p className="text-xs text-slate-400">Our model differentiates Rice Blast with 95% accuracy, compared to 88% for Brown Spot.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Seasonal Patterns */}
            <motion.div variants={itemVariants} className={`p-6 rounded-2xl ${theme.card} ${theme.glowBorder} flex flex-col min-h-[400px]`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-xl font-bold ${theme.text} mb-1`}>Seasonal Epidemiological Patterns</h3>
                  <p className={`text-sm ${theme.subText}`}>Historical prevalence across months</p>
                </div>
              </div>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonalData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: '#1e293b', opacity: 0.4}}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    />
                    <Legend />
                    <Bar dataKey="Rice Blast" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Brown Spot" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className={`p-5 rounded-2xl ${theme.card} ${theme.glowBorder}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Model Performance</h4>
                  <p className="text-xs text-slate-400">v2.1 Vision Transformer</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Global Accuracy</span>
                  <span className="text-sm font-bold text-emerald-400">96.8%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">False Positive Rate</span>
                  <span className="text-sm font-bold text-emerald-400">1.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Recall Score</span>
                  <span className="text-sm font-bold text-emerald-400">95.4%</span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className={`p-5 rounded-2xl ${theme.card} ${theme.glowBorder}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Top Risk Districts</h4>
                  <p className="text-xs text-slate-400">Based on 30-day trailing data</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Krishna District</span>
                  <span className="text-xs px-2 py-1 bg-rose-500/20 text-rose-400 rounded-md font-bold">83 / 100</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Guntur</span>
                  <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-md font-bold">65 / 100</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">West Godavari</span>
                  <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-md font-bold">52 / 100</span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className={`p-5 rounded-2xl ${theme.card} ${theme.glowBorder}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Fastest Growing Pathogen</h4>
                  <p className="text-xs text-slate-400">Highest week-over-week velocity</p>
                </div>
              </div>
              <div className="text-center py-2">
                <h2 className="text-3xl font-black text-rose-400 mb-1">Rice Blast</h2>
                <p className="text-sm text-slate-400">+42% increase in detections</p>
              </div>
            </motion.div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}
