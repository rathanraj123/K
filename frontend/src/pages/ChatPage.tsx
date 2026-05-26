import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, User, Loader2, Menu, X, Mic, CheckCircle2, 
  FlaskConical, Globe, Download, Share, PanelRight, Brain, Sprout, ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore, ChatMessage } from '@/store/useAppStore';
import { api, API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import ChatSidebar from '@/components/ChatSidebar';
import RightInsightPanel from '@/components/RightInsightPanel';
import { cn, safeDate } from '@/lib/utils';

// Markdown/UI Parser for AI responses
const FormattedMessage = ({ content, role, isStreaming }: { content: string, role: 'user' | 'assistant', isStreaming?: boolean }) => {
  if (role === 'user') return <div className="text-sm md:text-base font-medium">{content}</div>;

  const renderInlineMarkdown = (text: string) => {
    let processed = text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-foreground font-black">{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
    return processed;
  };

  const elements = [];
  const lines = content.split('\n');
  const remainingElements = [];
  let inList = false;
  let listItems = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.toLowerCase().includes('confidence:') || trimmed.toLowerCase().includes('severity:')) {
      const isHigh = trimmed.toLowerCase().includes('high') || trimmed.toLowerCase().includes('critical') || trimmed.includes('9');
      remainingElements.push(
        <div key={i} className="my-3">
          <Badge variant="outline" className={cn("px-3 py-1 font-bold text-[10px] uppercase tracking-wider", isHigh ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20")}>
            <CheckCircle2 className="w-3 h-3 inline mr-1.5" />
            {trimmed.replace(/^- /, '')}
          </Badge>
        </div>
      );
      continue;
    }

    if (!trimmed) {
      if (inList) {
        remainingElements.push(<ul key={`ul-${i}`} className="my-3 space-y-2 ml-1">{listItems}</ul>);
        inList = false;
        listItems = [];
      }
      remainingElements.push(<div key={i} className="h-3" />);
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(
        <li key={i} className="flex gap-3 text-sm md:text-base leading-relaxed text-foreground/90 items-start">
          <span className="text-emerald-500 mt-1"><CheckCircle2 className="w-4 h-4" /></span>
          <span>{renderInlineMarkdown(trimmed.substring(2))}</span>
        </li>
      );
      continue;
    }

    if (trimmed.startsWith('#')) {
      const level = trimmed.match(/^#+/)?.[0].length || 1;
      const text = trimmed.replace(/^#+\s/, '');
      const sizes = ['text-2xl font-black', 'text-xl font-bold', 'text-lg font-bold uppercase tracking-wider text-muted-foreground'];
      remainingElements.push(<div key={i} className={cn("mt-6 mb-3", sizes[Math.min(level - 1, 2)])}>{renderInlineMarkdown(text)}</div>);
      continue;
    }

    remainingElements.push(<p key={i} className="text-sm md:text-base leading-loose text-foreground/90 font-medium">{renderInlineMarkdown(line)}</p>);
  }

  if (inList) remainingElements.push(<ul key="ul-end" className="my-3 space-y-2 ml-1">{listItems}</ul>);
  elements.push(<div key="remaining">{remainingElements}</div>);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {elements}
      {isStreaming && <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 animate-pulse rounded-full" />}
    </div>
  );
};

export default function ChatPage() {
  const { 
    token, isHydrated, currentChatThreadId, setCurrentChatThreadId, fetchChatThreads,
    pendingChatContext, setPendingChatContext, activeScanContext
  } = useAppStore();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hiddenContextStr, setHiddenContextStr] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const messagesLengthRef = useRef(0);
  const isLoadingRef = useRef(false);

  useEffect(() => { messagesLengthRef.current = messages.length; }, [messages.length]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  // Voice Recognition Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              setInput(prev => prev + transcript + ' ');
            } else {
              currentTranscript += transcript;
            }
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsRecording(true);
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
    }
  };

  useEffect(() => {
    if (isHydrated && token) fetchChatThreads();
  }, [isHydrated, token, fetchChatThreads]);

  // Handle Scan-to-Chat Injection
  useEffect(() => {
    if (pendingChatContext) {
      // 1. Clear current chat thread to force a new one
      setCurrentChatThreadId(null);
      
      // 2. Inject Local Welcome Message
      const welcomeMsg: ChatMessage = {
        message_id: Date.now().toString() + "-welcome",
        role: 'assistant',
        content: `I have received your crop scan report.\n\n**Detected:** ${pendingChatContext.diseaseName.replace(/_/g, ' ')}\n**Severity:** ${pendingChatContext.severity}\n\nI have the full context of the treatment plan and environmental factors. How would you like to proceed? You can ask for a detailed treatment workflow, organic solutions, or weather risk analysis.`,
        timestamp: safeDate().toISOString()
      };
      setMessages([welcomeMsg]);
      
      // 3. Prepare hidden context for the backend
      const payload = {
        disease: pendingChatContext.diseaseName,
        severity: pendingChatContext.severity,
        farmerReport: pendingChatContext.farmerReport
      };
      setHiddenContextStr(`[SYSTEM DIRECTIVE: The user has just scanned a crop. Here is the JSON context: ${JSON.stringify(payload)}. Use this context for all subsequent answers. Address the user directly as a helpful farming AI assistant.]\n\n`);
      
      // 4. Open right panel to show context
      setIsRightPanelOpen(true);
      
      // 5. Clear pending state
      setPendingChatContext(null);
    }
  }, [pendingChatContext, setPendingChatContext, setCurrentChatThreadId]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentChatThreadId || !token) {
        if (messagesLengthRef.current === 0 && !hiddenContextStr) setMessages([]); 
        return;
      }
      if (isLoadingRef.current && messagesLengthRef.current > 0) return;
      setIsLoading(true);
      try {
        const msgs = await api.get<ChatMessage[]>(`/chatbot/threads/${currentChatThreadId}/messages`);
        if (msgs) setMessages(msgs.sort((a, b) => new Date(a.created_at || a.timestamp || 0).getTime() - new Date(b.created_at || b.timestamp || 0).getTime()));
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, [currentChatThreadId, token, hiddenContextStr]);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleSend = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const targetInput = overrideInput || input;
    if (!targetInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      message_id: Date.now().toString(),
      role: 'user',
      content: targetInput.trim(),
      timestamp: safeDate().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    if (!overrideInput) setInput('');
    setIsLoading(true);

    let contentToSend = userMessage.content;
    if (hiddenContextStr) {
      contentToSend = hiddenContextStr + "User Question: " + userMessage.content;
      setHiddenContextStr(''); // Only send once
    }

    try {
      const response = await fetch(`${API_BASE_URL}/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: contentToSend }],
          thread_id: currentChatThreadId || undefined
        })
      });

      if (!response.ok) throw new Error('Stream failed');
      
      const tempAiId = Date.now().toString() + "-ai";
      setMessages(prev => [...prev, {
        message_id: tempAiId,
        role: 'assistant',
        content: '',
        timestamp: safeDate().toISOString()
      }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        let aiFullContent = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.thread_id && !currentChatThreadId) {
                  setCurrentChatThreadId(parsed.thread_id);
                  const newThread = {
                    id: parsed.thread_id,
                    title: userMessage.content.substring(0, 30) + '...',
                    created_at: safeDate().toISOString(),
                    updated_at: safeDate().toISOString()
                  };
                  useAppStore.setState(prev => ({ chatThreads: [newThread, ...prev.chatThreads] }));
                }
                
                if (parsed.content) {
                  aiFullContent += parsed.content;
                  setMessages(prev => prev.map(msg => msg.message_id === tempAiId ? { ...msg, content: aiFullContent } : msg));
                }
              } catch (e) {
                // stream error
              }
            }
          }
        }
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        message_id: Date.now().toString() + "-err",
        role: 'assistant', 
        content: `⚠️ Connection error: ${error?.message || "Unknown"}\nPlease ensure the backend is running.`,
        timestamp: safeDate().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentChatThreadId(null);
    setMessages([]);
    setInput('');
    setHiddenContextStr('');
    useAppStore.setState({ activeScanContext: null });
    setIsRightPanelOpen(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen pt-8 flex flex-col items-center justify-center px-4 bg-background">
        <div className="glass p-8 rounded-3xl max-w-md text-center shadow-2xl border border-border/40">
          <Brain className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Expert Intelligence</h2>
          <p className="text-muted-foreground mb-6 font-medium">Log in to access personalized AI farming consultation.</p>
          <Link to="/login" className="w-full">
            <Button className="bg-emerald-500 text-white rounded-xl px-8 h-12 w-full font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors">Sign In to Continue</Button>
          </Link>
        </div>
      </div>
    );
  }

  const SUGGESTED_ACTIONS = [
    "Give me a step-by-step treatment plan",
    "Are there organic solutions?",
    "How does the weather impact this?",
    "What is the estimated yield loss?"
  ];

  return (
    <div className="flex h-full bg-background overflow-hidden relative">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[150px] mix-blend-screen opacity-50 animate-pulse" />
      </div>

      {/* Sidebar */}
      <div className={cn(
        "z-50 w-72 md:w-64 lg:w-72 shrink-0 transform transition-transform duration-500 ease-out absolute md:relative pt-16 md:pt-0 h-[calc(100vh-4rem)] md:h-full shadow-2xl md:shadow-none border-r border-border/20",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
      )}>
        <ChatSidebar onNewChat={startNewChat} className="h-full bg-card/50 backdrop-blur-xl" />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative min-w-0 z-10">
        <header className="flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/20 z-20 sticky top-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden rounded-xl bg-card border border-border/50" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X /> : <Menu />}
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg leading-tight text-foreground">AI Intelligence</span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Expert Connected
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeScanContext && (
               <Badge variant="outline" className="hidden sm:flex bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 text-xs uppercase font-bold">
                 Scan Context Active
               </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} className={cn("rounded-xl transition-colors", isRightPanelOpen ? "bg-emerald-500/10 text-emerald-500" : "text-muted-foreground")}>
              <PanelRight className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1 px-4 md:px-0 scroll-smooth">
          <div className="max-w-3xl mx-auto py-8 md:py-12 space-y-8 min-h-full pb-64">
            {messages.length === 0 && !isLoading ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-2xl shadow-emerald-500/10">
                   <Sprout className="w-12 h-12 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3 text-foreground">How can I help your farm today?</h2>
                  <p className="text-muted-foreground max-w-md mx-auto text-sm font-medium">
                    I am an expert agricultural AI. I can analyze crop diseases, generate treatment plans, and provide farming advice.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mt-8">
                  {SUGGESTED_ACTIONS.map(q => (
                    <button key={q} onClick={() => handleSend(undefined, q)} className="p-4 rounded-2xl border border-border/40 bg-card hover:bg-accent hover:border-emerald-500/30 text-left text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-emerald-500/5 group">
                      <span className="flex items-center justify-between">
                        {q} <ArrowRight className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => {
                  const isLastAiMsg = msg.role === 'assistant' && index === messages.length - 1 && isLoading;
                  return (
                    <motion.div key={msg.message_id || msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-4 w-full", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn("w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center mt-1 shadow-sm border", msg.role === 'user' ? "bg-accent border-border/50 text-foreground" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500")}>
                        {msg.role === 'user' ? <User className="w-5 h-5" /> : <Brain className="w-5 h-5" />}
                      </div>
                      <div className={cn("flex-1 space-y-2", msg.role === 'user' ? "max-w-[80%] md:max-w-[70%] text-right" : "max-w-full text-left")}>
                        <div className={cn("p-5 rounded-3xl text-sm md:text-base leading-relaxed tracking-normal transition-all", msg.role === 'user' ? "bg-foreground text-background rounded-tr-sm ml-auto" : "bg-card/60 backdrop-blur-md border border-border/40 rounded-tl-sm shadow-sm")}>
                          <FormattedMessage content={msg.content} role={msg.role} isStreaming={isLastAiMsg} />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
            
            {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
              <div className="flex gap-4 w-full">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500"><Brain className="w-5 h-5" /></div>
                <div className="bg-card/60 backdrop-blur-md border border-border/40 p-5 rounded-3xl rounded-tl-sm w-full max-w-sm">
                  <div className="flex items-center gap-3"><Loader2 className="w-4 h-4 animate-spin text-emerald-500" /><span className="text-sm font-bold text-foreground">Consulting knowledge base...</span></div>
                </div>
              </div>
            )}
            <div ref={scrollRef} className="h-10" />
          </div>
        </ScrollArea>

        {/* Command Center Input */}
        <div className="absolute bottom-0 inset-x-0 px-4 pb-4 pt-12 md:px-8 md:pb-6 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto relative pointer-events-auto">
            
            {/* Quick Actions if AI replied */}
            {messages.length > 0 && messages[messages.length-1].role === 'assistant' && !isLoading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 mb-4 px-2 overflow-x-auto custom-scrollbar pb-2">
                {SUGGESTED_ACTIONS.slice(0, 3).map(action => (
                  <button key={action} onClick={() => handleSend(undefined, action)} className="px-4 py-2 rounded-xl bg-card border border-border/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-all whitespace-nowrap shadow-sm">
                    {action}
                  </button>
                ))}
              </motion.div>
            )}

            <div className="relative group">
              <div className="absolute -inset-1 bg-emerald-500/20 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700"></div>
              <div className="relative bg-card/90 backdrop-blur-2xl rounded-[2rem] p-2 shadow-2xl border border-border/50 transition-all focus-within:border-emerald-500/40">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask the AI Expert..."
                      className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 md:px-6 h-12 md:h-14 text-base font-medium text-foreground placeholder:text-muted-foreground/50 pr-12"
                      disabled={isLoading}
                    />
                    <div className="absolute right-2 flex items-center">
                      <Button type="button" onClick={toggleRecording} variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl border border-transparent transition-all", isRecording ? "bg-red-500/20 text-red-500 animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                        <Mic className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !input.trim()}
                    className="rounded-[1.25rem] h-12 w-12 md:h-14 md:w-14 p-0 shrink-0 bg-emerald-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-all hover:bg-emerald-600 disabled:bg-muted disabled:text-muted-foreground"
                  >
                    <Send className="w-5 h-5 ml-1" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className={cn(
        "z-40 shrink-0 transform transition-all duration-500 ease-in-out absolute right-0 xl:relative h-full bg-background border-l border-border/20 overflow-hidden",
        isRightPanelOpen ? "translate-x-0 w-80 opacity-100" : "translate-x-full xl:translate-x-0 w-0 opacity-0 border-transparent"
      )}>
        <div className="w-80 h-full">
          <RightInsightPanel />
        </div>
      </div>
    </div>
  );
}
