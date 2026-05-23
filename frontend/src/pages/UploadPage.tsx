import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, X, Loader2, Sparkles, CheckCircle2, Mic } from 'lucide-react';
import { useAppStore, ScanResult, RawScanResult, mapBackendToScanResult } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import ScanResultDashboard from '@/components/scan/ScanResultDashboard';

const CROP_TYPES = ['Rice', 'Wheat', 'Tomato', 'Potato', 'Cotton', 'Maize', 'Sugarcane', 'Other'];
const REGIONS = ['North India', 'South India', 'East India', 'West India', 'Central India', 'Other'];
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForCompletedDetection(initial: RawScanResult): Promise<RawScanResult> {
  let response = initial;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (response.status !== 'processing') return response;
    if (!response.id) throw new Error('Backend did not return a scan ID.');

    await sleep(POLL_INTERVAL_MS);
    response = await api.get<RawScanResult>(`/detection/${response.id}`);
  }

  throw new Error('Analysis is still running. Please check History in a moment.');
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cropType, setCropType] = useState('Rice');
  const [region, setRegion] = useState('');
  const { addScan, userRole, token, fetchHistory } = useAppStore();
  const setScanning = useUIStore((state) => state.setScanning);
  const { location: geoLocation, status: geoStatus, setRegionFallback } = useGeolocation();

  useEffect(() => {
    if (token) fetchHistory();
  }, [fetchHistory, token]);

  // Restore latest scan from localStorage and sync with backend
  useEffect(() => {
    const cachedScan = localStorage.getItem('latestScanResult');
    if (cachedScan) {
      try {
        const parsed = JSON.parse(cachedScan);
        setResult(parsed);
        if (parsed.imageUrl) setPreview(parsed.imageUrl);
      } catch (e) {
        console.error('Failed to parse cached scan', e);
      }
    }

    const fetchLatestScan = async () => {
      if (!token) return;
      try {
        const item = await api.get<RawScanResult | null>('/detection/latest');
        if (item && item.id) {
          const mappedScan = mapBackendToScanResult(item);
          localStorage.setItem('latestScanResult', JSON.stringify(mappedScan));
          setResult(mappedScan);
          setPreview(mappedScan.imageUrl);
        } else {
          // If backend has no scans for this user, clear the state to prevent cross-account leakage
          setResult(null);
          setPreview(null);
          localStorage.removeItem('latestScanResult');
        }
      } catch (error) {
        console.warn('Could not sync latest scan from backend:', error);
      }
    };

    fetchLatestScan();
  }, [token]);

  // Sync region selection to geolocation fallback
  useEffect(() => {
    if (region && (geoStatus === 'denied' || geoStatus === 'manual' || !geoLocation)) {
      setRegionFallback(region);
    }
  }, [geoLocation, geoStatus, region, setRegionFallback]);

  const isFarmer = userRole === 'farmer';
  const processingSteps = isFarmer
    ? ['Reading image...', 'Analyzing quality...', 'Detecting disease...', 'Generating intelligence...', 'Done!']
    : ['Preprocessing image...', 'Running AI model...', 'Generating intelligence...', 'Building report...', 'Done!'];

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(f.type)) {
      toast({
        title: 'Unsupported image',
        description: 'Please upload a JPG or PNG image.',
        variant: 'destructive',
      });
      return;
    }

    if (f.size > MAX_UPLOAD_SIZE_BYTES) {
      toast({
        title: 'Image is too large',
        description: 'Please upload an image under 10 MB.',
        variant: 'destructive',
      });
      return;
    }

    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file || !preview) return;
    setIsProcessing(true);
    setProcessingStep(0);

    const formData = new FormData();
    formData.append('file', file);

    // Append geolocation data
    if (geoLocation) {
      formData.append('lat', String(geoLocation.latitude));
      formData.append('lon', String(geoLocation.longitude));
      if (geoLocation.locationName) {
        formData.append('location_name', geoLocation.locationName);
      }
    }
    formData.append('crop_type', cropType || 'Rice');

    setScanning(true);
    let stepTimer: ReturnType<typeof setInterval> | undefined;

    try {
      stepTimer = setInterval(() => {
        setProcessingStep(prev => (prev < processingSteps.length - 2 ? prev + 1 : prev));
      }, 1200);

      const initialResponse = await api.post<RawScanResult>('/detection/analyze', formData);
      const response = await waitForCompletedDetection(initialResponse);

      if (response.status === 'failed') {
        throw new Error(response.explanation || 'Image processing failed.');
      }

      setProcessingStep(processingSteps.length - 1);
      await sleep(500);

      const scan = mapBackendToScanResult(response, preview);

      addScan(scan);
      setResult(scan);
      localStorage.setItem('latestScanResult', JSON.stringify(scan));
      toast({
        title: 'Scan complete',
        description: `${scan.diseaseName.replace(/_/g, ' ')} detected with ${scan.confidence.toFixed(1)}% confidence.`,
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      const message = error instanceof Error ? error.message : 'Please make sure the backend is running.';
      toast({
        title: 'Analysis failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      if (stepTimer) clearInterval(stepTimer);
      setIsProcessing(false);
      setScanning(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    localStorage.removeItem('latestScanResult');
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {isFarmer ? (
              <>Crop <span className="gradient-text">Scanner</span></>
            ) : (
              <>AI <span className="gradient-text">Plant Scanner</span></>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isFarmer
              ? 'Take or upload a photo of your crop leaf. We\'ll tell you what\'s wrong and how to fix it.'
              : 'Upload a clear leaf image for instant AI-powered disease diagnosis and intelligence report.'}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {!preview ? (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`glass rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
                      isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <input id="file-input" type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Upload className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{isFarmer ? 'Upload crop photo' : 'Drop your image here'}</h3>
                    <p className="text-muted-foreground text-sm mb-4">or click to browse — PNG, JPG up to 10MB</p>
                    <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-accent px-3 py-1.5 rounded-lg">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      {isFarmer ? 'Tip: Take a close-up photo of the affected leaf' : 'Tip: Use a clear, well-lit photo for best results'}
                    </div>
                  </div>

                  {/* Crop/Region + Location */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block">Crop Type</label>
                      <select value={cropType} onChange={(e) => setCropType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl glass text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/30">
                        {CROP_TYPES.map(c => <option key={c} value={c} className="bg-background text-foreground">{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block">Region</label>
                      <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full px-4 py-2.5 rounded-xl glass text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="" className="bg-background text-foreground">Select region...</option>
                        {REGIONS.map(r => <option key={r} value={r} className="bg-background text-foreground">{r}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Location status indicator */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                    {geoStatus === 'granted' && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        📍 Location detected — weather intelligence enabled
                      </>
                    )}
                    {geoStatus === 'requesting' && (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Requesting location access...
                      </>
                    )}
                    {geoStatus === 'denied' && region && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        📍 Using regional default — {region}
                      </>
                    )}
                    {geoStatus === 'denied' && !region && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                        📍 Select a region for weather intelligence
                      </>
                    )}
                  </div>

                  {isFarmer && (
                    <button className="glass rounded-xl px-5 py-3 flex items-center gap-3 text-sm font-medium hover:bg-accent/50 transition-colors w-full justify-center">
                      <Mic className="w-5 h-5 text-primary" />
                      Tap to describe your problem (Voice)
                    </button>
                  )}
                </div>
              ) : (
                <div className="glass rounded-2xl p-6 space-y-6">
                  <div className="relative">
                    <img src={preview} alt="Preview" className="w-full max-h-80 object-contain rounded-xl bg-muted/50" />
                    <button onClick={clearFile} className="absolute top-3 right-3 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors shadow-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{file?.name}</p>
                        <p className="text-xs text-muted-foreground">{file ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : ''}</p>
                      </div>
                    </div>
                    <button onClick={handleAnalyze} disabled={isProcessing} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm disabled:opacity-70 hover:opacity-95 transition-opacity shadow-lg">
                      {isProcessing ? (<><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</>) : (<><Sparkles className="w-4 h-4" />{isFarmer ? 'Check My Crop' : 'Analyze with AI'}</>)}
                    </button>
                  </div>
                  {isProcessing && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pt-2 border-t border-border/50">
                      {processingSteps.map((step, i) => (
                        <div key={step} className={`flex items-center gap-3 text-sm py-1.5 transition-all ${i <= processingStep ? 'opacity-100' : 'opacity-30'}`}>
                          {i < processingStep ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : i === processingStep ? <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />}
                          <span className={i <= processingStep ? 'text-foreground' : 'text-muted-foreground'}>{step}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <ScanResultDashboard
              result={result}
              isFarmer={isFarmer}
              onNewScan={clearFile}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
