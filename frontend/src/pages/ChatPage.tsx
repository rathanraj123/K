import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, BrainCircuit, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore, ChatMessage } from '@/store/useAppStore';
import { api, apiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import ChatSidebar from '@/components/ChatSidebar';
import { cn } from '@/lib/utils';

const renderInlineMarkdown = (text: string) => {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="text-primary font-bold">{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

// Simple Markdown-inspired renderer for a polished look without injecting HTML.
const FormattedMessage = ({ content, role }: { content: string, role: 'user' | 'assistant' }) => {
  if (role === 'user') return <>{content}</>;

  const parts = content.split('\n').map((line, i) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div key={i} className="h-2" />;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={i} className="ml-2 mb-1 flex gap-2">
          <span className="text-primary">-</span>
          <span>{renderInlineMarkdown(trimmed.substring(2))}</span>
        </div>
      );
    }

    return <p key={i} className="mb-2 last:mb-0">{renderInlineMarkdown(line)}</p>;
  });

  return <div className="prose prose-sm dark:prose-invert max-w-none">{parts}</div>;
};

export default function ChatPage() {
  const { userRole, userName, token, isHydrated, currentChatThreadId, setCurrentChatThreadId, fetchChatThreads } = useAppStore();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesLengthRef = useRef(0);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    messagesLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Initial fetch - wait for hydration and token
  useEffect(() => {
    if (isHydrated && token) {
      fetchChatThreads();
    }
  }, [isHydrated, token, fetchChatThreads]);

  // Handle incoming context from scanner (UploadPage.tsx)
  useEffect(() => {
    if (location.state?.context) {
      setInput(location.state.context);
      // Clear location state to avoid re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch messages when thread changes
  useEffect(() => {
    const fetchMessages = async () => {
      // If we don't have a thread ID, we're in "New Chat" mode. 
      // DON'T clear messages if we just sent one (to avoid flicker)
      if (!currentChatThreadId || !token) {
        if (messagesLengthRef.current === 0) setMessages([]); 
        return;
      }

      // If we're already loading messages in handleSend, or if current messages
      // already match this thread (e.g. just created it), avoid redundant clears
      if (isLoadingRef.current && messagesLengthRef.current > 0) return;

      setIsLoading(true);
      try {
        const msgs = await api.get<ChatMessage[]>(`/chatbot/threads/${currentChatThreadId}/messages`);
        setMessages(msgs);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, [currentChatThreadId, token]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const tempId = Date.now().toString();
    const userMsg: ChatMessage = { 
      message_id: tempId, 
      role: 'user', 
      content: input, 
      timestamp: new Date().toISOString() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    const payload = input;
    setInput('');
    setIsLoading(true);

    try {
      // 1. Add a temporary AI message to the UI
      const tempAiId = Date.now().toString() + "-ai";
      setMessages(prev => [
        ...prev, 
        { 
          message_id: tempAiId, 
          role: 'assistant', 
          content: '',
          timestamp: new Date().toISOString()
        }
      ]);

      const response = await fetch(apiUrl('/chatbot/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content
          })),
          thread_id: currentChatThreadId || undefined,
          context: { role: userRole, platform: 'web' }
        })
      });

      if (!response.ok) throw new Error(`Chat request failed with status ${response.status}`);
      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let threadIdAssigned = false;
      let buffer = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          
          // The last element is either an empty string (if it ended with \n\n) or an incomplete chunk.
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              const dataStr = trimmedLine.replace('data: ', '').trim();
              if (dataStr === '[DONE]') {
                done = true;
                break;
              }
              
              try {
                const parsed = JSON.parse(dataStr);
                
                if (parsed.thread_id && !threadIdAssigned) {
                  threadIdAssigned = true;
                  if (!currentChatThreadId) {
                    setCurrentChatThreadId(parsed.thread_id);
                    // Optimistically add to sidebar since ES indexing is async
                    const newThread = {
                      id: parsed.thread_id,
                      title: payload.substring(0, 30) + (payload.length > 30 ? '...' : ''),
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    };
                    useAppStore.setState(prev => ({
                       chatThreads: [newThread, ...prev.chatThreads]
                    }));
                  }
                }
                
                // If it's a content chunk
                if (parsed.content !== undefined) {
                  setMessages(prev => prev.map(msg => {
                    if (msg.message_id === tempAiId) {
                      return { ...msg, content: msg.content + parsed.content };
                    }
                    return msg;
                  }));
                }
              } catch (e) {
                console.error("Parse error chunk:", dataStr);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat failed:', error);
      setMessages(prev => [...prev, { 
        message_id: Date.now().toString() + "-err",
        role: 'assistant', 
        content: "I apologize, but I'm having trouble connecting to my knowledge base. Please try again in a moment.",
        timestamp: new Date().toISOString()
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
      <div className="min-h-screen pt-32 flex flex-col items-center justify-center px-4 bg-background">
        <div className="glass p-8 rounded-3xl max-w-md text-center shadow-2xl">
          <BrainCircuit className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Expert Portal</h2>
          <p className="text-muted-foreground mb-6">Access our specialized agricultural AI knowledge base.</p>
          <Link to="/login" className="w-full">
            <Button className="gradient-primary rounded-xl px-8 h-12 w-full font-bold shadow-lg shadow-primary/20">
              Sign In to Continue
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden pt-16">
      {/* Historical Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 pt-16 md:pt-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <ChatSidebar onNewChat={startNewChat} className="h-full" />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Header Overlay */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
        
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/30 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden rounded-lg"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X /> : <Menu />}
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 animate-float">
                <BrainCircuit className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-base tracking-tight">AgriCosmo AI</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Scientific Expert</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:flex bg-primary/5 text-primary border-primary/20 animate-in fade-in slide-in-from-right-4 duration-500">
               Llama 3.3 · Groq
            </Badge>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 md:px-8">
          <div className="max-w-3xl mx-auto py-8 space-y-8">
            {messages.length === 0 && !isLoading ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-[2.5rem] bg-accent flex items-center justify-center">
                   <Bot className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight mb-2">How can I help you, {userName}?</h2>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    I can help you audit crop health, suggest fertilizers, or analyze skincare compounds from plants.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {[
                    "Identify Tomato Late Blight symptoms",
                    "Suggest organic Nitrogen sources",
                    "How to lower soil pH naturally?",
                    "Benefits of Aloe Vera for skin"
                  ].map(q => (
                    <button 
                      key={q}
                      onClick={() => setInput(q)}
                      className="p-4 rounded-2xl border border-border/50 bg-card/30 hover:bg-accent/50 text-left text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.message_id || msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-4 md:gap-6",
                      msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-xl shrink-0 flex items-center justify-center mt-1 shadow-sm",
                      msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={cn(
                      "flex-1 space-y-2 max-w-[85%] md:max-w-[75%]",
                      msg.role === 'user' ? "text-right" : "text-left"
                    )}>
                      <div className={cn(
                        "p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-sm text-sm md:text-base leading-relaxed tracking-normal",
                        msg.role === 'user' 
                          ? "bg-primary text-primary-foreground rounded-tr-none ml-auto" 
                          : "bg-card border border-border/50 rounded-tl-none prose prose-sm dark:prose-invert"
                      )}>
                        <FormattedMessage content={msg.content} role={msg.role === 'user' ? 'user' : 'assistant'} />
                      </div>
                      <div className="px-2">
                        <span className="text-[10px] text-muted-foreground font-medium opacity-50">
                          {new Date(msg.timestamp || msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            
            {isLoading && (
              <div className="flex gap-4 md:gap-6">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-card border border-border/50 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground font-medium">Generating scientific response...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="p-4 md:p-8 bg-gradient-to-t from-background to-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="glass rounded-2xl md:rounded-[2rem] p-2 shadow-2xl border-primary/10 transition-all focus-within:shadow-primary/5 focus-within:border-primary/30">
              <form 
                onSubmit={handleSend} 
                className="flex items-center gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe your agricultural challenge..."
                  className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 md:px-6 h-12 md:h-14 text-base placeholder:text-muted-foreground/50"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || !input.trim()}
                  className="rounded-xl md:rounded-2xl h-10 w-10 md:h-12 md:w-12 p-0 shrink-0 gradient-primary shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <Send className="w-5 h-5 text-primary-foreground" />
                </Button>
              </form>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-3 opacity-60">
              AgriCosmo AI can provide scientific insights. Always verify critical decisions with a local professional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
