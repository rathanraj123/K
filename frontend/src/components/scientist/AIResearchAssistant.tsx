import { Bot, Send } from 'lucide-react';

export function AIResearchAssistant() {
  return (
    <div className="bg-black/40 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-500" /> AgriCosmo Core
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Scientific LLM Assistant</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-900/30 rounded-xl border border-slate-800 p-4 mb-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Bot className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="bg-slate-800/50 rounded-xl rounded-tl-none p-3 border border-slate-700/50">
            <p className="text-xs text-slate-300 leading-relaxed">
              System initialized. I am monitoring global climate datasets, regional disease outbreaks, and live scan feeds. How can I assist your research today?
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <input 
          type="text" 
          placeholder="Query the intelligence core..." 
          className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <button className="absolute right-2 top-2 p-2 bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
