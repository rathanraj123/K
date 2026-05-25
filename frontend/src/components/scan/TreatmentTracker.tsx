import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Star, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

interface Props {
  detectionId: string;
}

export default function TreatmentTracker({ detectionId }: Props) {
  const [treatmentApplied, setTreatmentApplied] = useState('');
  const [progress, setProgress] = useState(0);
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get(`/detection/${detectionId}/treatment`);
        if (res.data) {
          setTreatmentApplied(res.data.treatment_applied || '');
          setProgress(res.data.recovery_progress || 0);
          setRating(res.data.feedback_rating || 0);
          setComments(res.data.comments || '');
          setSaved(true);
        }
      } catch (e) {
        // Not found is fine, it means no track exists yet
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [detectionId]);

  const handleSubmit = async () => {
    if (!treatmentApplied) {
      toast({
        title: 'Required Field',
        description: 'Please enter the treatment you applied.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/detection/${detectionId}/treatment`, {
        treatment_applied: treatmentApplied,
        recovery_progress: progress,
        feedback_rating: rating || null,
        comments: comments || null,
      });
      setSaved(true);
      toast({
        title: 'Progress Saved',
        description: 'Your treatment recovery progress has been recorded.',
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error',
        description: 'Failed to save treatment progress.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="glass rounded-2xl p-6 mt-5 border border-primary/20">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        Treatment Effectiveness Tracker
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Track the recovery of your crop to help improve our AI's future recommendations.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Treatment Applied</label>
          <input
            type="text"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            placeholder="e.g., Tricyclazole 75% WP"
            value={treatmentApplied}
            onChange={(e) => setTreatmentApplied(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">
            Recovery Progress ({progress}%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full h-2 bg-secondary/20 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>No Improvement</span>
            <span>Fully Recovered</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Effectiveness Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`transition-colors ${
                  star <= rating ? 'text-yellow-500' : 'text-muted-foreground/30 hover:text-yellow-500/50'
                }`}
              >
                <Star className="w-6 h-6 fill-current" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Additional Comments</label>
          <textarea
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
            placeholder="Did you notice any side effects?"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        <div className="pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {saved ? 'Progress Updated' : 'Save Progress'}
          </button>
        </div>
      </div>
    </div>
  );
}
