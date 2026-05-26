import React, { useEffect, useState } from 'react';
import { scientificService } from '@/services/scientificService';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, ExternalLink, ActivitySquare } from 'lucide-react';

export function ScientificNewsFeed() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await scientificService.getNews();
        setNews(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  return (
    <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl h-full flex flex-col">
       <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Newspaper className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Scientific Research Feed</h3>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">Live Updates & Publications</p>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
         {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />)
         ) : news.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
               <ActivitySquare className="w-8 h-8 mb-2 opacity-50" />
               <p className="text-xs font-semibold">No recent research found.</p>
            </div>
         ) : (
            news.map((item, i) => (
               <a 
                 key={i} 
                 href={item.url} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="block p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-purple-500/30 transition-all group"
               >
                 <div className="flex justify-between items-start mb-2 gap-4">
                    <h4 className="font-bold text-sm text-slate-200 group-hover:text-purple-400 transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h4>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5 group-hover:text-purple-400" />
                 </div>
                 <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">{item.summary}</p>
                 <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase">
                    <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">{item.source || 'Research Journal'}</span>
                    <span>{new Date(item.published_at).toLocaleDateString()}</span>
                 </div>
               </a>
            ))
         )}
       </div>
    </div>
  );
}
