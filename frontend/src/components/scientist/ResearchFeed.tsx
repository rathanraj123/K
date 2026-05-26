import { BookOpen, ExternalLink, Library } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchAgricultureNews, NewsArticle } from '@/services/newsService';
import { Skeleton } from '@/components/ui/skeleton';

export function ResearchFeed() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgricultureNews().then(setNews).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-black/40 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <Library className="w-5 h-5 text-indigo-400" /> Literature & Intelligence
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Live Global Research Feed</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4 bg-slate-800" />
              <Skeleton className="h-3 w-1/2 bg-slate-800/50" />
            </div>
          ))
        ) : (
          news.slice(0, 5).map((item, idx) => (
            <a 
              key={idx} 
              href={item.url} 
              target="_blank" 
              rel="noreferrer"
              className="block p-4 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-800 hover:border-indigo-500/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {item.category || 'RESEARCH'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{new Date(item.publishedAt).toISOString().split('T')[0]}</span>
              </div>
              <h4 className="text-sm font-bold text-white leading-snug mb-1 group-hover:text-indigo-400 transition-colors">
                {item.title}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2 mb-3">{item.description}</p>
              
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> {item.source.name}
                </span>
                <span className="text-[10px] text-indigo-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Read Paper <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
