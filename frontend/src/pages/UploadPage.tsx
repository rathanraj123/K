import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, Sparkles, AlertCircle, RefreshCw, CheckCircle2, ChevronRight, ChevronLeft, Beaker, Leaf, FlaskConical, Plus } from 'lucide-react';
import { useAppStore, ScanResult, RawScanResult, mapBackendToScanResult, UploadCard } from '@/store/useAppStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ScanResultDashboard from '@/components/scan/ScanResultDashboard';
import { cn } from '@/lib/utils';

const CROP_TYPES = ['Rice', 'Wheat', 'Tomato', 'Potato', 'Cotton', 'Maize', 'Sugarcane', 'Other'];
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForCompletedDetection(initial: RawScanResult): Promise<RawScanResult> {
  let response = initial;
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (response.status !== 'processing') {
      if (response.status === 'failed') {
        throw new Error(response.explanation || 'AI pipeline failed due to low image quality or no leaf detected.');
      }
      return response;
    }
    if (!response.id) throw new Error('Backend did not return a scan ID.');
    await sleep(POLL_INTERVAL_MS);
    response = await api.get<RawScanResult>(`/detection/${response.id}`);
  }
  throw new Error('Analysis timed out.');
}



export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [cropType, setCropType] = useState('Rice');
  
  const uploads = useAppStore(s => s.activeUploads);
  const setUploads = useAppStore(s => s.setActiveUploads);
  
  const userRole = useAppStore(s => s.userRole);
  const currentScan = useAppStore(s => s.currentScan);
  const setCurrentScan = useAppStore(s => s.setCurrentScan);
  const addScan = useAppStore(s => s.addScan);
  const { location: geoLocation } = useGeolocation();

  const [viewingDashboard, setViewingDashboard] = useState(false);

  // If user navigates here with an existing scan and NO uploads, show dashboard
  useEffect(() => {
    if (currentScan && uploads.length === 0) {
      setViewingDashboard(true);
    }
  }, [currentScan, uploads.length]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newUploads: UploadCard[] = [];
    
    Array.from(files).forEach(f => {
      if (!ACCEPTED_IMAGE_TYPES.includes(f.type)) return;
      if (f.size > MAX_UPLOAD_SIZE_BYTES) return;
      newUploads.push({
        id: Math.random().toString(36).substring(7),
        file: f,
        preview: URL.createObjectURL(f),
        progress: 0,
        status: 'pending'
      });
    });

    if (newUploads.length > 0) {
      setUploads(prev => [...prev, ...newUploads]);
      setViewingDashboard(false); // Force grid view when dragging new files
      newUploads.forEach(u => processUpload(u.id, u.file));
    }
  }, []);

  const processUpload = async (id: string, file: File) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'uploading', progress: 10 } : u));
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('crop_type', cropType);
      formData.append('language', 'English');
      if (geoLocation) {
        formData.append('lat', geoLocation.latitude.toString());
        formData.append('lon', geoLocation.longitude.toString());
      }

      setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 40 } : u));
      const response = await api.post<RawScanResult>('/detection/analyze', formData);
      setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'analyzing', progress: 60 } : u));
      
      const completedRaw = await waitForCompletedDetection(response);
      if (completedRaw.status === 'failed') throw new Error("AI pipeline failed.");
      
      const mappedResult = mapBackendToScanResult(completedRaw);
      addScan(mappedResult);
      
      // DO NOT auto-set currentScan here, let them click View Report to avoid jarring navigation
      setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'success', progress: 100, result: mappedResult } : u));
    } catch (err: any) {
      setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error', progress: 0, error: err.message || "Upload failed." } : u));
    }
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const retryUpload = (id: string) => {
    const upload = uploads.find(u => u.id === id);
    if (upload && upload.file) processUpload(id, upload.file);
  };

  const handleViewReport = (result: ScanResult) => {
    setCurrentScan(result);
    setViewingDashboard(true);
  };

  const handleBackToGrid = () => {
    setCurrentScan(null);
    setViewingDashboard(false);
  };

  const handleNewScan = () => {
    setCurrentScan(null);
    setUploads([]);
    setViewingDashboard(false);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  if (viewingDashboard && currentScan) {
    return (
      <div className="flex-1 p-4 md:p-8 bg-background relative overflow-y-auto overflow-x-hidden min-h-screen pt-12 md:pt-16">
        <div className="max-w-6xl mx-auto space-y-6 w-full">
          <div className="flex items-center justify-between mb-8 mt-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={handleBackToGrid} className="rounded-xl font-bold hover:bg-card">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back to Uploads
              </Button>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Intelligence Report</h1>
            </div>
            <Button variant="outline" onClick={handleNewScan} className="rounded-xl font-bold text-destructive border-destructive/20 hover:bg-destructive/10">
              Clear All
            </Button>
          </div>
          <ScanResultDashboard result={currentScan} isFarmer={userRole === 'farmer'} onNewScan={handleNewScan} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 bg-background relative overflow-y-auto min-h-screen pt-8">
       <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] mix-blend-screen opacity-40 animate-pulse" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
      </div>

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-3 pt-8">
          <Badge variant="outline" className="bg-card/50 backdrop-blur font-bold uppercase tracking-widest text-[10px] text-primary border-primary/20">
            <Sparkles className="w-3 h-3 inline mr-1" /> Multi-Image Analysis Engine
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Advanced Crop Intelligence</h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto font-medium">
            Upload multiple high-resolution images of affected leaves, stems, or soil. Our PyTorch pipeline will run parallel diagnostics.
          </p>
        </div>

        {/* Dropzone */}
        <div 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative w-full h-64 md:h-80 rounded-[2.5rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 bg-card/40 backdrop-blur-3xl overflow-hidden group shadow-2xl",
            isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-primary/20 hover:border-primary/50 hover:bg-card/60"
          )}
        >
          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            multiple
          />
          <div className="flex flex-col items-center justify-center text-center space-y-4 relative z-0">
             <div className="w-20 h-20 rounded-3xl bg-background border border-primary/20 shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative">
               <div className="absolute inset-0 bg-primary/20 blur-xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
               <Upload className="w-8 h-8 text-primary relative z-10" />
             </div>
             <div>
                <p className="text-lg font-bold text-foreground">Drag & drop research images</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium tracking-wide">Supports JPG, PNG up to 10MB each</p>
             </div>
          </div>
        </div>


        {/* Preview Cards Grid */}
        {uploads.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
            <AnimatePresence>
              {uploads.map(upload => (
                <motion.div
                  key={upload.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-xl shadow-primary/5 flex flex-col relative group"
                >
                  {/* Image Preview Area */}
                  <div className="relative h-48 w-full bg-black/50">
                    <img src={upload.preview} alt="Upload preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Status Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                      {upload.status === 'uploading' && (
                         <div className="flex items-center gap-2 text-white font-bold text-sm">
                           <Loader2 className="w-4 h-4 animate-spin text-primary" /> Uploading to Secure Bucket...
                         </div>
                      )}
                      {upload.status === 'analyzing' && (
                         <div className="flex items-center gap-2 text-white font-bold text-sm">
                           <Sparkles className="w-4 h-4 animate-pulse text-warning" /> Running PyTorch Inference...
                         </div>
                      )}
                      {upload.status === 'error' && (
                         <div className="flex flex-col gap-1.5">
                           <div className="flex items-center gap-2 text-destructive font-bold text-sm shadow-black drop-shadow-md">
                             <AlertCircle className="w-4 h-4" /> Inference Failed
                           </div>
                           {upload.error && (
                             <span className="text-[10px] font-medium max-w-[180px] leading-tight text-white/90 bg-destructive/80 p-1.5 rounded-md backdrop-blur-sm">
                               {upload.error}
                             </span>
                           )}
                         </div>
                      )}
                      {upload.status === 'success' && upload.result && (
                         <div className="flex flex-col gap-1">
                           <span className={cn("text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded backdrop-blur w-fit border", 
                              upload.result.confidence > 80 ? "bg-destructive/20 border-destructive/50 text-destructive-foreground" : "bg-primary/20 border-primary/50 text-primary-foreground")}>
                             {upload.result.confidence > 80 ? 'Critical' : 'Detected'}
                           </span>
                           <span className="text-white font-bold truncate text-lg shadow-black drop-shadow-md">
                             {upload.result.diseaseName.replace(/_/g, ' ')}
                           </span>
                         </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {['uploading', 'analyzing'].includes(upload.status) && (
                    <div className="w-full h-1 bg-secondary/50 relative overflow-hidden">
                      <motion.div 
                        className="absolute inset-y-0 left-0 bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="p-3 bg-card flex justify-between items-center border-t border-border/30">
                     <span className="text-xs text-muted-foreground font-semibold truncate max-w-[150px]">
                       {upload.file?.name || 'Uploaded File'}
                     </span>
                     
                     <div className="flex gap-2">
                       {upload.status === 'error' && (
                         <Button size="icon" variant="ghost" className="h-8 w-8 text-warning" onClick={() => retryUpload(upload.id)}>
                           <RefreshCw className="w-4 h-4" />
                         </Button>
                       )}
                       {upload.status === 'success' && upload.result && (
                         <Button size="sm" variant="ghost" className="h-8 font-bold text-primary gap-1" onClick={() => handleViewReport(upload.result!)}>
                           View Report <ChevronRight className="w-4 h-4" />
                         </Button>
                       )}
                       <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeUpload(upload.id)}>
                         <X className="w-4 h-4" />
                       </Button>
                     </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        
        <div className="h-32" />
      </div>
    </div>
  );
}
