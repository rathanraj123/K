import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, BrainCircuit, Menu, X, Mic, ChevronDown, CheckCircle2, FlaskConical, Globe, Download, Share, PanelRight } from 'lucide-react';
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

// Extreme Markdown Parser for Scientific Blocks
const FormattedMessage = ({ content, role, isStreaming }: { content: string, role: 'user' | 'assistant', isStreaming?: boolean }) => {
  if (role === 'user') return <div className="text-sm md:text-base">{content}</div>;

  const renderInlineMarkdown = (text: string) => {
    let processed = text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-foreground font-extrabold">{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
    return processed;
  };

  const elements = [];
  
  // Custom JSON UI Component Parser
  const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g;
  let lastIndex = 0;
  let match;
  
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    // Render text before JSON block
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore.trim()) {
      elements.push(
        <div key={`text-${lastIndex}`} className="space-y-4">
          {textBefore.split('\n').map((line, i) => (
            line.trim() ? <p key={i} className="text-sm md:text-base leading-relaxed">{renderInlineMarkdown(line)}</p> : <div key={i} className="h-2" />
          ))}
        </div>
      );
    }
    
    // Parse JSON block
    try {
      const data = JSON.parse(match[1]);
      if (data.component === 'treatment_card') {
        elements.push(
          <div key={`json-${match.index}`} className="my-6 p-5 rounded-2xl bg-card border border-primary/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm tracking-wider uppercase flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary" /> Treatment Protocol
              </span>
              <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", data.urgency?.toLowerCase() === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-warning/10 text-warning border-warning/20')}>
                {data.urgency || 'Monitor'} Urgency
              </Badge>
            </div>
            <ul className="space-y-2 mb-4">
              {(data.actions || []).map((act: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {act}
                </li>
              ))}
            </ul>
            {data.cost && (
              <div className="pt-3 border-t border-border/50 text-xs font-bold text-foreground">
                Estimated Cost: <span className="text-primary">{data.cost}</span>
              </div>
            )}
          </div>
        );
      } else {
        // Fallback for unknown JSON
        elements.push(<pre key={`json-${match.index}`} className="my-4 p-4 rounded-xl bg-black/50 text-xs text-muted-foreground overflow-x-auto">{match[1]}</pre>);
      }
    } catch (e) {
      elements.push(<pre key={`json-${match.index}`} className="my-4 p-4 rounded-xl bg-black/50 text-xs text-muted-foreground overflow-x-auto">{match[1]}</pre>);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Render remaining text
  const textAfter = content.slice(lastIndex);
  if (textAfter.trim() || isStreaming) {
    const lines = textAfter.split('\n');
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
            <Badge variant="outline" className={cn("px-3 py-1 font-bold text-[10px] uppercase tracking-wider", isHigh ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-primary/10 text-primary border-primary/20")}>
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
            <span className="text-primary mt-1 shadow-[0_0_10px_rgba(16,185,129,0.3)]"><FlaskConical className="w-3.5 h-3.5" /></span>
            <span>{renderInlineMarkdown(trimmed.substring(2))}</span>
          </li>
        );
        continue;
      }

      if (trimmed.startsWith('#')) {
        const level = trimmed.match(/^#+/)?.[0].length || 1;
        const text = trimmed.replace(/^#+\s/, '');
        const sizes = ['text-2xl font-extrabold', 'text-xl font-bold', 'text-lg font-bold uppercase tracking-wider text-muted-foreground'];
        remainingElements.push(<div key={i} className={cn("mt-6 mb-3", sizes[Math.min(level - 1, 2)])}>{renderInlineMarkdown(text)}</div>);
        continue;
      }

      remainingElements.push(<p key={i} className="text-sm md:text-base leading-loose text-foreground/90">{renderInlineMarkdown(line)}</p>);
    }

    if (inList) remainingElements.push(<ul key="ul-end" className="my-3 space-y-2 ml-1">{listItems}</ul>);
    elements.push(<div key="remaining">{remainingElements}</div>);
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {elements}
      {isStreaming && <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />}
    </div>
  );
};

export default function ChatPage() {
  const { userRole, userName, token, isHydrated, currentChatThreadId, setCurrentChatThreadId, fetchChatThreads } = useAppStore();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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

  useEffect(() => {
    if (location.state?.context) {
      setInput(location.state.context);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentChatThreadId || !token) {
        if (messagesLengthRef.current === 0) setMessages([]); 
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
  }, [currentChatThreadId, token]);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleDownload = () => {
    if (messages.length === 0) {
      alert("No messages to download.");
      return;
    }
    const content = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}\n`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agricosmo-chat-${safeDate().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AgriCosmo AI Chat',
          text: 'Check out this agricultural analysis!',
          url: window.location.href,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      message_id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: safeDate().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage.content }],
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
                console.error("Parse error chunk:", dataStr);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Chat stream error:", error);
      const errMsg = error?.message || "Unknown error";
      setMessages(prev => [...prev, { 
        message_id: Date.now().toString() + "-err",
        role: 'assistant', 
        content: `⚠️ Connection error: ${errMsg}\n\nPlease check that the backend server is running and you are logged in.`,
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
  };

  if (!token) {
    return (
      <div className="min-h-screen pt-8 flex flex-col items-center justify-center px-4 bg-background">
        <div className="glass p-8 rounded-3xl max-w-md text-center shadow-2xl">
          <BrainCircuit className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Scientific Expert Portal</h2>
          <p className="text-muted-foreground mb-6">Access our specialized agricultural AI knowledge base.</p>
          <Link to="/login" className="w-full">
            <Button className="gradient-primary rounded-xl px-8 h-12 w-full font-bold shadow-lg shadow-primary/20">Sign In to Continue</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background overflow-hidden relative">
      {/* Global Atmosphere & Depth */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
      </div>

      {/* Historical Sidebar */}
      <div className={cn(
        "z-50 w-72 md:w-64 lg:w-72 shrink-0 transform transition-transform duration-500 ease-out absolute md:relative pt-16 md:pt-0 h-[calc(100vh-4rem)] md:h-full",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
      )}>
        <ChatSidebar onNewChat={startNewChat} className="h-full" />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative min-w-0 z-10">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/20 bg-background/40 backdrop-blur-3xl z-20 sticky top-0 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden rounded-lg bg-card border border-border/50" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X /> : <Menu />}
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center shadow-inner">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight leading-tight">Expert Intelligence</span>
                <span className="text-[10px] text-primary font-bold uppercase tracking-widest flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Connected</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:flex bg-card/50 backdrop-blur border-border/50 px-3 py-1 gap-2 text-xs">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Llama 3.3 Research
            </Badge>
            <div className="hidden sm:flex gap-1">
              <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8 rounded-lg hover:bg-accent/50"><Share className="w-4 h-4 text-muted-foreground" /></Button>
              <Button variant="ghost" size="icon" onClick={handleDownload} className="h-8 w-8 rounded-lg hover:bg-accent/50"><Download className="w-4 h-4 text-muted-foreground" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} className={cn("h-8 w-8 rounded-lg hover:bg-accent/50 transition-colors", isRightPanelOpen ? "bg-primary/20 text-primary" : "text-muted-foreground")}>
                <PanelRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1 px-4 md:px-0 scroll-smooth">
          <div className="max-w-[900px] mx-auto py-12 space-y-10 min-h-full pb-52">
            {messages.length === 0 && !isLoading ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center space-y-8">
                <div className="w-24 h-24 rounded-3xl bg-card border border-border/50 flex items-center justify-center shadow-2xl shadow-primary/5 animate-float">
                   <BrainCircuit className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-4xl font-extrabold tracking-tight mb-3">Scientific Research Assistant</h2>
                  <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
                    Advanced reasoning engine for pathology, agronomy, and biological compound analysis.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                  {["Analyze soil microbiota impact on yield", "Explain Alternaria pathogenesis in tomatoes", "Synthesize a copper fungicide treatment plan", "Compare NPK vs Organic Nitrogen efficacy"].map(q => (
                    <button key={q} onClick={() => setInput(q)} className="p-4 rounded-2xl border border-border/30 bg-card/30 hover:bg-card/80 hover:border-primary/30 text-left text-[13px] font-medium leading-relaxed transition-all hover:-translate-y-1 hover:shadow-xl shadow-primary/5">
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => {
                  const isLastAiMsg = msg.role === 'assistant' && index === messages.length - 1 && isLoading;
                  return (
                    <motion.div key={msg.message_id || msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-4 md:gap-6 w-full", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn("w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center mt-1 shadow-sm border", msg.role === 'user' ? "bg-card border-border/50 text-foreground" : "bg-primary/10 border-primary/20 text-primary")}>
                        {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                      </div>
                      <div className={cn("flex-1 space-y-2", msg.role === 'user' ? "max-w-[70%] md:max-w-[60%] text-right" : "max-w-full text-left")}>
                        <div className={cn("p-5 md:p-7 rounded-3xl shadow-sm text-sm md:text-base leading-relaxed tracking-normal transition-all", msg.role === 'user' ? "bg-foreground text-background rounded-tr-sm ml-auto" : "bg-card/40 backdrop-blur-xl border border-border/50 rounded-tl-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)]")}>
                          <FormattedMessage content={msg.content} role={msg.role} isStreaming={isLastAiMsg} />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
            
            {isLoading && messages.length === 0 && (
              <div className="flex gap-6 w-full">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"><Bot className="w-5 h-5" /></div>
                <div className="bg-card/40 backdrop-blur-xl border border-border/50 p-6 rounded-3xl rounded-tl-sm w-full max-w-md">
                  <div className="flex items-center gap-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="text-sm font-semibold text-foreground/80">Synthesizing intelligence...</span></div>
                </div>
              </div>
            )}
            <div ref={scrollRef} className="h-10" />
          </div>
        </ScrollArea>

        {/* Floating AI Input Box */}
        <div className="absolute bottom-0 inset-x-0 px-4 pb-4 pt-12 md:px-8 md:pb-6 md:pt-16 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto relative pointer-events-auto">
            {/* Quick Actions Bar */}
            <div className="flex gap-2 mb-3 px-2 overflow-x-auto no-scrollbar">
              {['/analyze image', '/summarize', '/treatment plan'].map(action => (
                <button key={action} onClick={() => setInput(action + ' ')} className="px-3 py-1.5 rounded-full bg-card border border-border/50 text-[10px] font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap">
                  {action}
                </button>
              ))}
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700"></div>
              <div className="relative bg-card/80 backdrop-blur-2xl rounded-[2rem] p-2 shadow-2xl border border-border/50 transition-all focus-within:border-primary/30">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask the scientific intelligence engine..."
                      className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 md:px-6 h-12 md:h-14 text-base text-foreground placeholder:text-muted-foreground/50 font-medium pr-12"
                      disabled={isLoading}
                    />
                    <div className="absolute right-2 flex items-center">
                      <Button type="button" onClick={toggleRecording} variant="ghost" size="icon" className={cn("h-10 w-10 rounded-full border border-transparent transition-all", isRecording ? "bg-destructive/20 text-destructive border-destructive/50 animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-card hover:border-border/50")}>
                        <Mic className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !input.trim()}
                    className="rounded-2xl h-12 w-12 p-0 shrink-0 bg-foreground text-background shadow-lg hover:scale-105 active:scale-95 transition-all hover:bg-primary hover:text-primary-foreground"
                  >
                    <Send className="w-5 h-5 ml-1" />
                  </Button>
                </form>
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-4 opacity-50 font-semibold tracking-widest uppercase">
              AgriCosmo AI is a generative model. Verify critical scientific data.
            </p>
          </div>
        </div>
      </div>

      {/* Right Insight Panel */}
      <div className={cn(
        "z-40 shrink-0 transform transition-all duration-500 ease-in-out absolute right-0 xl:relative h-full bg-background border-l border-border/20 shadow-2xl xl:shadow-none overflow-hidden",
        isRightPanelOpen ? "translate-x-0 w-80 opacity-100" : "translate-x-full xl:translate-x-0 w-0 opacity-0 border-transparent"
      )}>
        <div className="w-80 h-full">
          <RightInsightPanel />
        </div>
      </div>
    </div>
  );
}
