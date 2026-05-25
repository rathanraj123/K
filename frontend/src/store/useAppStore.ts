import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, apiAssetUrl } from '@/lib/api';
import { safeDate } from '@/lib/utils';

export type UserRole = 'farmer' | 'scientist' | 'admin';

// ─── Intelligence Sub-Types ─────────────────────────────────────

export interface ConfidenceEntry {
  label: string;
  value: number; // 0-100
}

export interface VisualEvidence {
  feature: string;
  description: string;
  confidence_contribution: string;
}

export interface ExplainableAI {
  visual_evidence: VisualEvidence[];
  reasoning_summary: string;
}

export interface DiseaseIdentity {
  display_name: string;
  scientific_name: string;
  disease_category: string;
  spread_risk: string;
  contagiousness: string;
  crop_stage_affected: string;
}

export interface ImmediateAction {
  action: string;
  timing: string;
  precaution: string;
}

export interface OrganicTreatment {
  name: string;
  method: string;
  frequency: string;
}

export interface ChemicalTreatment {
  name: string;
  dosage: string;
  timing: string;
  precaution: string;
  cost_inr: string;
}

export interface PreventionMeasure {
  measure: string;
  description: string;
}

export interface DetailedTreatments {
  immediate_actions: ImmediateAction[];
  organic_treatments: OrganicTreatment[];
  chemical_treatments: ChemicalTreatment[];
  prevention: PreventionMeasure[];
  irrigation_advice: string;
  soil_recommendations: string;
}

export interface YieldLossEstimate {
  estimated_loss_pct_min: number;
  estimated_loss_pct_max: number;
  economic_impact: string;
  factors: string[];
  mitigation_potential: string;
}

export interface TimelineEntry {
  days: number;
  stage: string;
  description: string;
  severity_change: string;
}

export interface SimilarDisease {
  name: string;
  probability_pct: number;
  reason_rejected: string;
  key_difference?: string;
}

export interface SmartProduct {
  name: string;
  type: string;
  active_ingredient?: string;
  dosage: string;
  treatment_duration: string;
  price_inr: string;
  precautions: string;
  application_method?: string;
}

export interface AgronomistRecommendation {
  diagnosis_summary: string;
  urgency_level: string;
  recommended_actions: string[];
  progression_warning: string;
  recovery_prognosis: string;
  field_inspection_notes: string;
}

export interface ImageQuality {
  scan_quality_score: number;
  quality_grade: string;
  metrics: Record<string, number>;
  component_scores: Record<string, number>;
  flags: Record<string, boolean>;
  retake_suggestions: string[];
  needs_retake: boolean;
}

export interface WeatherConditions {
  temperature_c: number;
  humidity_pct: number;
  rainfall_mm: number;
  description: string;
}

export interface WeatherRisk {
  available: boolean;
  location?: string;
  current_conditions?: WeatherConditions;
  disease_risk?: {
    fungal_spread_risk_pct: number;
    risk_level: string;
    disease_category: string;
  };
  correlations: string[];
  agri_warnings: string[];
  error?: string;
}

// ─── New Role-Specific Intelligence Types ───────────────────────

export interface FarmerReport {
  diagnosis: string;
  severity: string;
  crop_risk: string;
  weather_impact: string;
  immediate_actions: string[];
  treatment_plan: {
    recommended_product: string;
    dosage: string;
    application_method: string;
    estimated_cost_inr: string;
    why_this_treatment?: string;
  };
  prevention_tips: string[];
  agronomist_summary: string;
  farmer_risk_score?: {
    crop_risk_score: number;
    estimated_yield_loss: string;
    urgency_level: string;
  };
}

export interface ScientistReport {
  primary_pathology: string;
  confidence_interpretation: string;
  visual_feature_analysis: string[];
  pathogen_profile: {
    scientific_name: string;
    taxonomy: string;
    infection_mechanism: string;
    disease_cycle_stage: string;
  };
  environmental_correlation: string;
  biochemical_impact: string[];
  epidemiological_risk: string;
  model_reasoning: string;
  research_recommendation: string;
}

// ─── Main Scan Result ───────────────────────────────────────────

export interface ScanResult {
  id: string;
  imageUrl: string;
  diseaseName: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  treatments: string[];
  cosmeticInsights: { compound: string; useCase: string }[];
  explanation: string;
  createdAt: string;
  cropType?: string;
  region?: string;

  // Existing sub-objects
  farmerTreatments?: {
    homeRemedies: string[];
    fertilizers: { name: string; dosage: string; cost: string }[];
    pesticides: { name: string; dosage: string; cost: string }[];
    urgency: 'immediate' | 'soon' | 'monitor';
    recoveryTime: string;
  };
  scientistData?: {
    pathogenInfo?: string;
    diseaseLifecycle?: string;
    spreadMechanism?: string;
    environmentalConditions?: string;
    treatmentRationale?: string;
    probabilities: { label: string; value: number }[];
    featureImportance: { feature: string; importance: number }[];
    classificationHierarchy: string[];
    datasetRef: string;
    chemicalComposition: { compound: string; percentage: number }[];
  };

  // New intelligence fields
  diseaseIdentity?: DiseaseIdentity;
  farmerReport?: FarmerReport;
  scientistReport?: ScientistReport;
  
  uncertaintyReasons?: string[];
  confidenceBreakdown?: { label: string; value: number }[];
  evolutionPrediction?: {
    spread_risk_next_7_days: string;
    expected_infection_growth_pct: number;
    recommended_intervention_window: string;
  };
  escalateToExpert?: boolean;
  
  // Geolocation
  scanLatitude?: number;
  scanLongitude?: number;
  scanLocationName?: string;

  explainabilityMeta?: {
    heatmap_url?: string | null;
    key_features_detected?: string[];
    infected_area_pct?: number;
    computed_severity?: string;
  };
  similarDiseases?: { disease_name: string; confidence: number }[];
}

export interface RawScanResult {
  id?: string;
  image_url?: string;
  imageUrl?: string;
  detected_disease?: string;
  diseaseName?: string;
  confidence?: number;
  severity?: string;
  treatments?: string[];
  cosmetic_insights?: Array<{ compound?: string; use_case?: string }>;
  cosmeticInsights?: { compound: string; useCase: string }[];
  explanation?: string;
  created_at?: string;
  createdAt?: string;
  crop_type?: string;
  cropType?: string;
  region?: string;
  farmer_treatments?: {
    home_remedies?: string[];
    fertilizers?: { name: string; dosage: string; cost: string }[];
    pesticides?: { name: string; dosage: string; cost: string }[];
    urgency?: 'immediate' | 'soon' | 'monitor';
    recovery_time?: string;
  };
  farmerTreatments?: ScanResult['farmerTreatments'];
  scientist_data?: {
    pathogen_info?: string;
    disease_lifecycle?: string;
    spread_mechanism?: string;
    environmental_conditions?: string;
    treatment_rationale?: string;
    probabilities?: { label: string; value: number }[];
    feature_importance?: { feature: string; importance: number }[];
    classification_hierarchy?: string[];
    dataset_ref?: string;
    chemical_composition?: { compound: string; percentage: number }[];
  };
  scientistData?: ScanResult['scientistData'];
  
  diseaseIdentity?: DiseaseIdentity;
  
  scientific_name?: string;
  disease_category?: string;
  spread_risk?: string;
  contagiousness?: string;
  crop_stage_affected?: string;

  // New role-specific fields
  farmer_report?: FarmerReport;
  farmerReport?: FarmerReport;
  scientist_report?: ScientistReport;
  scientistReport?: ScientistReport;
  
  uncertainty_reasons?: string[];
  confidence_breakdown?: { label: string; value: number }[];
  evolution_prediction?: ScanResult['evolutionPrediction'];
  escalate_to_expert?: boolean;
  
  scan_latitude?: number;
  scanLatitude?: number;
  scan_longitude?: number;
  scanLongitude?: number;
  scan_location_name?: string;
  scanLocationName?: string;
  status?: string;

  explainability_meta?: {
    heatmap_url?: string | null;
    key_features_detected?: string[];
    infected_area_pct?: number;
    computed_severity?: string;
  };
  explainabilityMeta?: ScanResult['explainabilityMeta'];
  similar_diseases?: Array<{ disease_name?: string; confidence?: number }>;
  similarDiseases?: ScanResult['similarDiseases'];
}

function normalizeSeverity(value?: string): ScanResult['severity'] {
  const normalized = value?.toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';
  return 'low';
}

function createFallbackScanId(): string {
  return globalThis.crypto?.randomUUID?.() || `scan-${Date.now()}`;
}

// ─── Mapper ─────────────────────────────────────────────────────

/**
 * Maps a raw backend response (snake_case) to the frontend ScanResult (camelCase).
 */
export function mapBackendToScanResult(item: RawScanResult, previewUrl?: string): ScanResult {
  const imageUrl = apiAssetUrl(item.image_url || item.imageUrl, previewUrl);

  return {
    id: item.id || createFallbackScanId(),
    imageUrl,
    diseaseName: item.detected_disease || item.diseaseName || 'Unknown',
    confidence: item.confidence && item.confidence <= 1 ? item.confidence * 100 : (item.confidence || 0),
    severity: normalizeSeverity(item.severity),
    treatments: item.treatments || [],
    cosmeticInsights: item.cosmetic_insights
      ? item.cosmetic_insights.map((c) => ({ compound: c.compound || '', useCase: c.use_case || '' }))
      : (item.cosmeticInsights || []),
    explanation: item.explanation || '',
    createdAt: item.created_at || item.createdAt || safeDate().toISOString(),
    cropType: item.crop_type || item.cropType,
    region: item.region,

    // Farmer treatments
    farmerTreatments: item.farmer_treatments ? {
      homeRemedies: item.farmer_treatments.home_remedies || [],
      fertilizers: item.farmer_treatments.fertilizers || [],
      pesticides: item.farmer_treatments.pesticides || [],
      urgency: item.farmer_treatments.urgency || 'monitor',
      recoveryTime: item.farmer_treatments.recovery_time || 'N/A',
    } : item.farmerTreatments,

    // Scientist data
    scientistData: item.scientist_data ? {
      pathogenInfo: item.scientist_data.pathogen_info,
      diseaseLifecycle: item.scientist_data.disease_lifecycle,
      spreadMechanism: item.scientist_data.spread_mechanism,
      environmentalConditions: item.scientist_data.environmental_conditions,
      treatmentRationale: item.scientist_data.treatment_rationale,
      probabilities: item.scientist_data.probabilities || [],
      featureImportance: item.scientist_data.feature_importance || [],
      classificationHierarchy: item.scientist_data.classification_hierarchy || [],
      datasetRef: item.scientist_data.dataset_ref || '',
      chemicalComposition: item.scientist_data.chemical_composition || [],
    } : item.scientistData,

    // New role-specific reports
    diseaseIdentity: {
      display_name: item.diseaseName || item.detected_disease || 'Unknown',
      scientific_name: item.scientific_name || '',
      disease_category: item.disease_category || '',
      spread_risk: item.spread_risk || '',
      contagiousness: item.contagiousness || '',
      crop_stage_affected: item.crop_stage_affected || '',
    },
    farmerReport: item.farmer_report || item.farmerReport,
    scientistReport: item.scientist_report || item.scientistReport,
    
    // Tracking Intelligence
    uncertaintyReasons: item.uncertainty_reasons,
    confidenceBreakdown: item.confidence_breakdown,
    evolutionPrediction: item.evolution_prediction,
    escalateToExpert: item.escalate_to_expert,
    
    // Geolocation mapping
    scanLatitude: item.scan_latitude || item.scanLatitude,
    scanLongitude: item.scan_longitude || item.scanLongitude,
    scanLocationName: item.scan_location_name || item.scanLocationName,

    // Explainability mapping
    explainabilityMeta: item.explainability_meta || item.explainabilityMeta,
    similarDiseases: (item.similar_diseases || item.similarDiseases || []).map(sd => ({
      disease_name: sd.disease_name || '',
      confidence: sd.confidence || 0
    })),
  };
}

// ─── Store Types ────────────────────────────────────────────────

export interface ChatMessage {
  message_id?: string;
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'disease_scan' | 'summary' | 'context';
  content: string;
  created_at?: string;
  timestamp?: string;
}

export interface ChatThread {
  id: string;
  title: string;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
}

interface AppState {
  isDark: boolean;
  toggleTheme: () => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  scanHistory: ScanResult[];
  addScan: (scan: ScanResult) => void;
  fetchHistory: () => Promise<void>;
  currentScan: ScanResult | null;
  setCurrentScan: (scan: ScanResult | null) => void;
  userName: string;
  setUserName: (name: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isLoading: boolean;
  isHydrated: boolean;
  
  uploadPreview: string | null;
  setUploadPreview: (preview: string | null) => void;

  // Chat History State
  chatThreads: ChatThread[];
  currentChatThreadId: string | null;
  setChatThreads: (threads: ChatThread[]) => void;
  setCurrentChatThreadId: (id: string | null) => void;
  fetchChatThreads: () => Promise<void>;
  updateChatThread: (id: string, data: {title?: string, is_pinned?: boolean}) => Promise<void>;
  deleteChatThread: (id: string) => Promise<void>;
  logout: () => void;
  
  // Offline Sync State
  offlineQueue: QueuedScan[];
  addToOfflineQueue: (scan: Omit<QueuedScan, 'id' | 'timestamp'>) => void;
  removeFromOfflineQueue: (id: string) => void;
  syncOfflineQueue: () => Promise<void>;
}

export interface QueuedScan {
  id: string;
  imageBlobUrl: string;
  base64Data: string;
  lat: number | null;
  lon: number | null;
  cropType: string;
  language: string;
  timestamp: string;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isDark: true,
      toggleTheme: () => set((s) => {
        const next = !s.isDark;
        if (typeof window !== 'undefined') {
          document.documentElement.classList.toggle('dark', next);
        }
        return { isDark: next };
      }),
      userRole: 'farmer',
      setUserRole: (role) => set({ userRole: String(role).toLowerCase() as UserRole }),
      scanHistory: [],
      addScan: (scan) => set((s) => ({ scanHistory: [scan, ...s.scanHistory] })),
      fetchHistory: async () => {
        if (!get().token) return;
        set({ isLoading: true });
        try {
          const history = await api.get<RawScanResult[]>('/detection/history');
          const mappedHistory: ScanResult[] = history.map(item => mapBackendToScanResult(item));
          set({ scanHistory: mappedHistory });
        } catch (error) {
          console.error('Failed to fetch history:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      currentScan: null,
      setCurrentScan: (scan) => set({ currentScan: scan }),
      uploadPreview: null,
      setUploadPreview: (preview) => set({ uploadPreview: preview }),
      userName: 'Researcher',
      setUserName: (name) => set({ userName: name }),
      language: 'English',
      setLanguage: (lang) => set({ language: lang }),
      token: typeof window !== 'undefined' ? localStorage.getItem('agricosmo-token') : null,
      setToken: (token) => {
        if (token) localStorage.setItem('agricosmo-token', token);
        else localStorage.removeItem('agricosmo-token');
        set({ token });
      },
      isLoading: false,
      isHydrated: false,

      // Chat History Actions
      chatThreads: [],
      currentChatThreadId: null,
      setChatThreads: (threads) => set({ chatThreads: threads }),
      setCurrentChatThreadId: (id) => set({ currentChatThreadId: id }),
      fetchChatThreads: async () => {
        if (!get().token) return;
        try {
          const threads = await api.get<ChatThread[]>('/chatbot/threads');
          
          set({ chatThreads: threads });
        } catch (error) {
          console.error('Failed to fetch chat threads:', error);
        }
      },
      updateChatThread: async (id, data) => {
        try {
          const updated = await api.patch<ChatThread>(`/chatbot/threads/${id}`, data);
          if (updated) {
            set((s) => ({
              chatThreads: s.chatThreads.map(t => t.id === id ? { ...t, ...updated } : t)
            }));
          }
        } catch (error) {
          console.error('Failed to update chat thread:', error);
        }
      },
      deleteChatThread: async (id) => {
        try {
          await api.delete(`/chatbot/threads/${id}`);
          set((s) => ({
            chatThreads: s.chatThreads.filter((t) => t.id !== id),
            currentChatThreadId: s.currentChatThreadId === id ? null : s.currentChatThreadId
          }));
        } catch (error) {
          console.error('Failed to delete chat thread:', error);
        }
      },
      logout: () => {
        localStorage.removeItem('agricosmo-token');
        localStorage.removeItem('latestScanResult');
        set({ 
          token: null, 
          currentScan: null, 
          uploadPreview: null,
          scanHistory: [], 
          chatThreads: [], 
          currentChatThreadId: null,
          userName: 'Researcher',
          userRole: 'farmer'
        });
      },
      offlineQueue: [],
      addToOfflineQueue: (scan) => {
        const queuedItem: QueuedScan = {
          ...scan,
          id: `offline-${Date.now()}`,
          timestamp: safeDate().toISOString(),
        };
        set((s) => ({ offlineQueue: [...s.offlineQueue, queuedItem] }));
      },
      removeFromOfflineQueue: (id) => set((s) => ({
        offlineQueue: s.offlineQueue.filter((item) => item.id !== id)
      })),
      syncOfflineQueue: async () => {
        const queue = get().offlineQueue;
        if (queue.length === 0 || !navigator.onLine || !get().token) return;
        
        console.log(`Syncing ${queue.length} offline scans...`);
        for (const item of queue) {
          try {
            // Convert base64 data to blob
            const base64Parts = item.base64Data.split(',');
            const mime = base64Parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
            const byteString = atob(base64Parts[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mime });
            
            // Build form data
            const formData = new FormData();
            formData.append('file', blob, `offline_scan_${item.id}.jpg`);
            if (item.lat !== null) formData.append('lat', String(item.lat));
            if (item.lon !== null) formData.append('lon', String(item.lon));
            formData.append('crop_type', item.cropType);
            formData.append('language', item.language);

            const response = await api.post<RawScanResult>('/detection/analyze', formData);
            if (response && response.id) {
              const mapped = mapBackendToScanResult(response);
              get().addScan(mapped);
              get().removeFromOfflineQueue(item.id);
            }
          } catch (error) {
            console.error(`Failed to sync offline scan ${item.id}:`, error);
          }
        }
      }
    }),
    {
      name: 'agricosmo-store',
      partialize: (state) => ({ 
        isDark: state.isDark, 
        userRole: state.userRole, 
        userName: state.userName, 
        language: state.language,
        token: state.token,
        currentChatThreadId: state.currentChatThreadId,
        chatThreads: state.chatThreads,
        currentScan: state.currentScan,
        uploadPreview: state.uploadPreview,
        offlineQueue: state.offlineQueue
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      }
    }
  )
);
