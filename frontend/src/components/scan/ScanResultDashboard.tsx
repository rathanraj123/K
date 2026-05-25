import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, TrendingUp, Activity, Target, Brain, Beaker, MapPin, Sparkles, Star, Send, Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ScanResult } from '@/store/useAppStore';
import { api, apiAssetUrl } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

// Dashboard components that still use standard non-generative data
import DiseaseHeader from './DiseaseHeader';
import SeverityMeter from './SeverityMeter';
import ImageQualityPanel from './ImageQualityPanel';
import WeatherRiskCard from './WeatherRiskCard';
import TreatmentTracker from './TreatmentTracker';

interface Props {
  result: ScanResult;
  isFarmer: boolean;
  onNewScan: () => void;
}

export default function ScanResultDashboard({ result, isFarmer, onNewScan }: Props) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [correctedDisease, setCorrectedDisease] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please select a rating before submitting.',
        variant: 'destructive',
      });
      return;
    }
    setSubmittingFeedback(true);
    try {
      await api.post(`/detection/${result.id}/feedback`, {
        rating,
        corrected_disease: correctedDisease || null,
        comments: comments || null,
      });
      setFeedbackSubmitted(true);
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you! Your feedback will help refine our diagnostic model.',
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast({
        title: 'Submission Failed',
        description: 'An error occurred while submitting your feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

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
      
      {result.escalateToExpert && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-500 font-bold text-sm">Escalated to Human Agronomist</h4>
            <p className="text-red-500/80 text-xs mt-1">
              Due to high severity and complex visual symptoms, this scan has been flagged for manual review by our expert team. A case ticket has been created.
            </p>
          </div>
        </motion.div>
      )}

      {/* Scanned image & Heatmap */}
      <div className="glass rounded-2xl p-4 relative overflow-hidden flex flex-col md:flex-row gap-4">
        <div className="relative w-full md:w-1/2 rounded-xl overflow-hidden group">
          <img
            src={result.imageUrl}
            alt="Scanned leaf"
            className="w-full h-full max-h-64 object-cover rounded-xl bg-muted/50 transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Real Explainability Heatmap Overlay from Backend */}
          {showHeatmap && result.explainabilityMeta?.heatmap_url && (
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              src={apiAssetUrl(result.explainabilityMeta.heatmap_url)}
              alt="AI Heatmap"
              className="absolute inset-0 w-full h-full max-h-64 object-cover rounded-xl bg-muted/50"
            />
          )}

          {/* Fallback CSS-based simulated Heatmap if no real heatmap exists */}
          {!showHeatmap && !isFarmer && (
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-red-500/20 to-purple-500/30 mix-blend-overlay pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          )}

          {result.imageQuality && result.imageQuality.scan_quality_score > 0 && (
            <div className={`absolute top-4 left-4 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-md shadow-lg ${
              result.imageQuality.quality_grade === 'excellent' || result.imageQuality.quality_grade === 'good'
                ? 'bg-emerald-500/80 text-white'
                : result.imageQuality.quality_grade === 'fair'
                  ? 'bg-amber-500/80 text-white'
                  : 'bg-red-500/80 text-white'
            }`}>
              📷 {result.imageQuality.scan_quality_score}/100 Quality
            </div>
          )}

          {result.explainabilityMeta?.heatmap_url && (
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`absolute bottom-4 right-4 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md backdrop-blur-md transition-all ${
                showHeatmap
                  ? 'bg-primary text-white ring-2 ring-primary/45'
                  : 'bg-black/60 text-white hover:bg-black/80'
              }`}
            >
              {showHeatmap ? '👁️ Show Original' : '🔥 AI Heatmap'}
            </button>
          )}

          {!isFarmer && !result.explainabilityMeta?.heatmap_url && (
            <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/60 text-white text-[10px] uppercase font-bold tracking-wider rounded backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
              Simulated Heatmap Active
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
          
          {result.evolutionPrediction && (
            <div className="bg-accent/40 rounded-xl p-4 border border-border/50 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-foreground uppercase">7-Day Evolution Forecast</span>
              </div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-muted-foreground">Spread Risk:</span>
                <span className={`font-bold ${result.evolutionPrediction.spread_risk_next_7_days === 'HIGH' ? 'text-red-500' : result.evolutionPrediction.spread_risk_next_7_days === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {result.evolutionPrediction.spread_risk_next_7_days}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-muted-foreground">Infection Growth:</span>
                <span className="font-bold">+{result.evolutionPrediction.expected_infection_growth_pct}%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Intervention Window:</span>
                <span className="font-bold text-primary">{result.evolutionPrediction.recommended_intervention_window}</span>
              </div>
            </div>
          )}
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
          {/* Farmer Risk Card */}
          {result.farmerReport.farmer_risk_score && (
            <div className="glass rounded-2xl p-6 border-l-4 border-l-orange-500">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Farmer Risk Assessment
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-accent/30 p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Crop Risk Score</span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black text-orange-500">{result.farmerReport.farmer_risk_score?.crop_risk_score ?? 0}</span>
                    <span className="text-sm font-semibold text-muted-foreground">/100</span>
                  </div>
                </div>
                <div className="bg-accent/30 p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Estimated Yield Loss</span>
                  <span className="text-2xl font-bold mt-2 text-foreground">{result.farmerReport.farmer_risk_score?.estimated_yield_loss ?? 'N/A'}</span>
                </div>
                <div className="bg-accent/30 p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Urgency Level</span>
                  <span className={`text-xl font-bold mt-2 uppercase tracking-wide ${
                    (result.farmerReport.farmer_risk_score?.urgency_level || '').toLowerCase() === 'critical' || (result.farmerReport.farmer_risk_score?.urgency_level || '').toLowerCase() === 'high'
                      ? 'text-red-500'
                      : (result.farmerReport.farmer_risk_score?.urgency_level || '').toLowerCase() === 'moderate'
                        ? 'text-amber-500'
                        : 'text-emerald-500'
                  }`}>{result.farmerReport.farmer_risk_score?.urgency_level ?? 'Low'}</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-1.5 w-full bg-secondary/20 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      (result.farmerReport.farmer_risk_score?.crop_risk_score ?? 0) > 75 
                        ? 'bg-red-500' 
                        : (result.farmerReport.farmer_risk_score?.crop_risk_score ?? 0) > 40 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${result.farmerReport.farmer_risk_score?.crop_risk_score ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}

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
                  {(result.farmerReport.immediate_actions || []).map((action, i) => (
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
                  {(result.farmerReport.prevention_tips || []).map((tip, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Target className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Product Recommendation */}
            <div className="mt-6 bg-accent/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 border border-primary/20">
              <div className="flex-1">
                <p className="text-xs font-bold text-primary mb-1">RECOMMENDED PRODUCT</p>
                <p className="font-bold text-lg">{result.farmerReport.treatment_plan?.recommended_product ?? 'None'}</p>
                <p className="text-sm text-muted-foreground mb-2">Dosage: {result.farmerReport.treatment_plan?.dosage ?? 'N/A'} • {result.farmerReport.treatment_plan?.application_method ?? 'N/A'}</p>
                
                {result.farmerReport.treatment_plan?.why_this_treatment && (
                  <div className="bg-primary/10 border border-primary/20 rounded-md p-3 mt-2">
                    <p className="text-xs font-bold text-primary mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Why this treatment?
                    </p>
                    <p className="text-sm text-foreground">{result.farmerReport.treatment_plan.why_this_treatment}</p>
                  </div>
                )}
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="text-xs font-bold text-muted-foreground mb-1">ESTIMATED COST</p>
                <p className="text-xl font-black text-foreground">{result.farmerReport.treatment_plan?.estimated_cost_inr ?? '₹0'}</p>
              </div>
            </div>
          </div>
          
          {/* Treatment Tracker Form */}
          <TreatmentTracker detectionId={result.id} />
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
                {(result.scientistReport.visual_feature_analysis || []).map((feature, i) => (
                  <li key={i} className="text-sm flex items-start gap-2 bg-accent/30 p-2.5 rounded-lg">
                    <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              {result.uncertaintyReasons && result.uncertaintyReasons.length > 0 && (
                <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                  <h4 className="text-xs font-bold text-orange-500 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> UNCERTAINTY FACTORS
                  </h4>
                  <ul className="space-y-1">
                    {result.uncertaintyReasons.map((reason, i) => (
                      <li key={i} className="text-xs text-orange-500/90">• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Pathogen Profile & Confidence Breakdown */}
            <div className="glass rounded-2xl p-6 flex flex-col gap-5">
              <div>
                <h3 className="font-bold text-sm mb-4 text-muted-foreground">PATHOGEN PROFILE</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-secondary mb-1">SCIENTIFIC NAME</p>
                    <p className="text-sm font-mono bg-accent/40 px-2 py-1 rounded inline-block">{result.scientistReport.pathogen_profile?.scientific_name ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-1">TAXONOMY</p>
                    <p className="text-sm">{result.scientistReport.pathogen_profile?.taxonomy ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-1">INFECTION MECHANISM</p>
                    <p className="text-sm">{result.scientistReport.pathogen_profile?.infection_mechanism ?? 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              {result.confidenceBreakdown && result.confidenceBreakdown.length > 0 && (
                <div className="border-t border-border/50 pt-4 mt-auto">
                  <h3 className="font-bold text-sm mb-3 text-muted-foreground">CONFIDENCE DISTRIBUTION</h3>
                  <div className="space-y-2">
                    {result.confidenceBreakdown.map((item, i) => (
                      <div key={i} className="relative w-full">
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                          <span className="truncate pr-2">{item.label.replace(/_/g, ' ')}</span>
                          <span>{item.value}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary/20 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${i === 0 ? 'bg-primary' : 'bg-secondary/50'}`}
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  {(result.scientistReport.biochemical_impact || []).map((impact, i) => (
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

      {/* ═══ VISUALLY SIMILAR DISEASES ═══ */}
      {result.similarDiseases && result.similarDiseases.length > 0 && (
        <div className="glass rounded-2xl p-6 border-l-4 border-l-amber-500 mb-6">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            Visually Similar Pathologies (Alternative Candidates)
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            AI detected these alternative crop conditions that share visual features with your primary diagnosis.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {result.similarDiseases.map((sd, i) => (
              <div key={i} className="flex justify-between items-center bg-accent/30 p-3 rounded-lg border border-accent/40">
                <span className="font-semibold text-sm capitalize">{sd.disease_name.replace('_', ' ')}</span>
                <span className="text-sm font-bold text-amber-500">{sd.confidence}% Match</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ USER FEEDBACK LOOP WIDGET ═══ */}
      <div className="glass rounded-2xl p-6 border border-primary/25 bg-primary/5 mb-6">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Continuous Learning Feedback
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Help improve our ML diagnostic engine by rating the accuracy and correcting prediction errors.
        </p>

        {feedbackSubmitted ? (
          <div className="flex items-center gap-2 text-success bg-success/15 p-4 rounded-xl border border-success/30">
            <Check className="w-5 h-5" />
            <span className="text-sm font-semibold">Thank you! Your feedback has been registered.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Rating Selector */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">DIAGNOSIS ACCURACY RATING</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-all hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/40'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Label Correction Selector */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">CORRECT DISEASE LABEL (IF INCORRECT)</p>
              <select
                value={correctedDisease}
                onChange={(e) => setCorrectedDisease(e.target.value)}
                className="w-full bg-background border border-muted-foreground/30 p-2.5 rounded-xl text-sm"
              >
                <option value="">-- No Correction (Diagnosis is Correct) --</option>
                <option value="rice_blast">Rice Blast</option>
                <option value="brown_spot">Brown Spot</option>
                <option value="leaf_smut">Leaf Smut</option>
                <option value="bacterial_leaf_blight">Bacterial Leaf Blight</option>
                <option value="tungro">Tungro</option>
                <option value="hispa">Hispa</option>
              </select>
            </div>

            {/* Comments Area */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">ADDITIONAL COMMENTS / OBSERVATIONS</p>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Describe any symptoms, leaf spots, or crop conditions..."
                className="w-full bg-background border border-muted-foreground/30 p-3 rounded-xl text-sm min-h-[80px]"
              />
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={submittingFeedback || rating === 0}
              onClick={handleSubmitFeedback}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 px-6 rounded-xl text-sm disabled:opacity-50 transition-all cursor-pointer pointer-events-auto"
            >
              {submittingFeedback ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Telemetry
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Fallback if still loading intelligence */}
      {(!result.farmerReport && !result.scientistReport && result.status !== 'failed') && (
        <div className="p-8 text-center animate-pulse">
          <p className="text-muted-foreground">Generating highly structured role-specific intelligence...</p>
        </div>
      )}
    </motion.div>
  );
}
