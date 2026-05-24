import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, TrendingUp, Activity, Target, Brain, Beaker, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ScanResult } from '@/store/useAppStore';

// Dashboard components that still use standard non-generative data
import DiseaseHeader from './DiseaseHeader';
import SeverityMeter from './SeverityMeter';
import ImageQualityPanel from './ImageQualityPanel';
import WeatherRiskCard from './WeatherRiskCard';

interface Props {
  result: ScanResult;
  isFarmer: boolean;
  onNewScan: () => void;
}

export default function ScanResultDashboard({ result, isFarmer, onNewScan }: Props) {
  return (
    <motion.div
      key="result-dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <span className="text-sm text-muted-foreground">AI Analysis Complete</span>
        </div>
        <button onClick={onNewScan} className="text-sm text-primary hover:underline font-medium transition-colors">
          New Scan →
        </button>
      </div>

      {/* Scanned image & Heatmap */}
      <div className="glass rounded-2xl p-4 relative overflow-hidden flex flex-col md:flex-row gap-4">
        <div className="relative w-full md:w-1/2 rounded-xl overflow-hidden group">
          <img
            src={result.imageUrl}
            alt="Scanned leaf"
            className="w-full h-full max-h-64 object-cover rounded-xl bg-muted/50 transition-transform duration-500 group-hover:scale-105"
          />
          {/* CSS-based simulated Heatmap for Scientist Mode */}
          {!isFarmer && (
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-red-500/20 to-purple-500/30 mix-blend-overlay pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          )}
          {result.imageQuality && result.imageQuality.scan_quality_score > 0 && (
            <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-md shadow-lg ${
              result.imageQuality.quality_grade === 'excellent' || result.imageQuality.quality_grade === 'good'
                ? 'bg-emerald-500/80 text-white'
                : result.imageQuality.quality_grade === 'fair'
                  ? 'bg-amber-500/80 text-white'
                  : 'bg-red-500/80 text-white'
            }`}>
              📷 {result.imageQuality.scan_quality_score}/100 Quality
            </div>
          )}
          {!isFarmer && (
            <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/60 text-white text-[10px] uppercase font-bold tracking-wider rounded backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
              AI Heatmap Active
            </div>
          )}
        </div>

        {/* Dynamic Progression Meter (Right Side of Image) */}
        <div className="w-full md:w-1/2 flex flex-col justify-center space-y-4 px-2">
          <DiseaseHeader
            diseaseName={result.diseaseName}
            diseaseIdentity={result.diseaseIdentity}
            severity={result.severity}
            confidence={result.confidence}
          />

          <div className="bg-accent/40 rounded-xl p-4 border border-border/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">Disease Progression</span>
              <span className="text-xs font-bold">{result.severity}</span>
            </div>
            <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: result.severity.toLowerCase() === 'high' ? '90%' : result.severity.toLowerCase() === 'medium' ? '50%' : '10%' }}
                className={`h-full ${result.severity.toLowerCase() === 'high' ? 'bg-red-500' : result.severity.toLowerCase() === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}
              />
            </div>
            {isFarmer ? (
              <p className="text-[10px] text-muted-foreground mt-2 mt-1">Recovery Chance: {result.severity.toLowerCase() === 'high' ? 'Low without immediate action' : 'Very Good'}</p>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-2 mt-1">Necrotic progression estimation based on lesion geometry.</p>
            )}
          </div>
        </div>
      </div>

      {/* Legacy/Standard ML Panels */}
      <div className="grid md:grid-cols-2 gap-5">
        <SeverityMeter severity={result.severity} confidence={result.confidence} />
        {/* We can place Weather Risk here if available */}
        {result.weatherRisk && result.weatherRisk.available && (
          <WeatherRiskCard data={result.weatherRisk} />
        )}
      </div>

      <ImageQualityPanel data={result.imageQuality} />

      {/* ═══ FARMER REPORT ═══ */}
      {isFarmer && result.farmerReport && (
        <div className="space-y-5">
          {/* Quick Action Guide */}
          <div className="glass rounded-2xl p-6 border-l-4 border-l-primary">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Immediate Agronomist Summary
            </h3>
            <p className="text-sm font-medium leading-relaxed mb-4">
              {result.farmerReport.agronomist_summary}
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-accent/30 p-4 rounded-xl">
                <p className="text-xs font-bold text-muted-foreground mb-1">CROP RISK</p>
                <p className="text-sm">{result.farmerReport.crop_risk}</p>
              </div>
              <div className="bg-accent/30 p-4 rounded-xl">
                <p className="text-xs font-bold text-muted-foreground mb-1">WEATHER IMPACT</p>
                <p className="text-sm">{result.farmerReport.weather_impact}</p>
              </div>
            </div>
          </div>

          {/* Treatment Plan */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-success" />
              Treatment Plan
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3">🛠 Immediate Actions</p>
                <ul className="space-y-2">
                  {result.farmerReport.immediate_actions.map((action, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3">🛡 Prevention Tips</p>
                <ul className="space-y-2">
                  {result.farmerReport.prevention_tips.map((tip, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Target className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Product Recommendation */}
            <div className="mt-6 bg-accent/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-primary/20">
              <div>
                <p className="text-xs font-bold text-primary mb-1">RECOMMENDED PRODUCT</p>
                <p className="font-bold text-lg">{result.farmerReport.treatment_plan.recommended_product}</p>
                <p className="text-sm text-muted-foreground">Dosage: {result.farmerReport.treatment_plan.dosage} • {result.farmerReport.treatment_plan.application_method}</p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="text-xs font-bold text-muted-foreground mb-1">ESTIMATED COST</p>
                <p className="text-xl font-black text-foreground">{result.farmerReport.treatment_plan.estimated_cost_inr}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SCIENTIST REPORT ═══ */}
      {!isFarmer && result.scientistReport && (
        <div className="space-y-5">
          {/* Scientific Executive Summary */}
          <div className="glass rounded-2xl p-6 border-l-4 border-l-secondary">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5 text-secondary" />
              Pathology & Model Inference
            </h3>
            <p className="text-sm font-medium leading-relaxed mb-3">
              {result.scientistReport.primary_pathology}
            </p>
            <p className="text-sm text-muted-foreground">
              {result.scientistReport.confidence_interpretation}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Visual Feature Analysis */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold text-sm mb-4 text-muted-foreground">VISUAL FEATURE ATTRIBUTION</h3>
              <ul className="space-y-3">
                {result.scientistReport.visual_feature_analysis.map((feature, i) => (
                  <li key={i} className="text-sm flex items-start gap-2 bg-accent/30 p-2.5 rounded-lg">
                    <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pathogen Profile */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold text-sm mb-4 text-muted-foreground">PATHOGEN PROFILE</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-secondary mb-1">SCIENTIFIC NAME</p>
                  <p className="text-sm font-mono bg-accent/40 px-2 py-1 rounded inline-block">{result.scientistReport.pathogen_profile.scientific_name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-1">TAXONOMY</p>
                  <p className="text-sm">{result.scientistReport.pathogen_profile.taxonomy}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-1">INFECTION MECHANISM</p>
                  <p className="text-sm">{result.scientistReport.pathogen_profile.infection_mechanism}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Biochemical & Environmental */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Beaker className="w-5 h-5 text-primary" />
              Biochemical & Epidemiological Data
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-2">BIOCHEMICAL IMPACT</p>
                <ul className="space-y-2">
                  {result.scientistReport.biochemical_impact.map((impact, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <span className="text-muted-foreground">{impact}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-1">ENVIRONMENTAL CORRELATION</p>
                  <p className="text-sm">{result.scientistReport.environmental_correlation}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-1">EPIDEMIOLOGICAL RISK</p>
                  <p className="text-sm">{result.scientistReport.epidemiological_risk}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Research Recommendation */}
          <div className="glass rounded-2xl p-6 bg-secondary/5 border border-secondary/20">
            <h3 className="font-bold text-sm mb-2 text-secondary flex items-center gap-2">
              <MapPin className="w-4 h-4" /> RESEARCH RECOMMENDATION
            </h3>
            <p className="text-sm font-medium">{result.scientistReport.research_recommendation}</p>
          </div>
        </div>
      )}

      {/* Fallback if still loading intelligence */}
      {(!result.farmerReport && !result.scientistReport && result.status !== 'failed') && (
        <div className="p-8 text-center animate-pulse">
          <p className="text-muted-foreground">Generating highly structured role-specific intelligence...</p>
        </div>
      )}
    </motion.div>
  );
}
