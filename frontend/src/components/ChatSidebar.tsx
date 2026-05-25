import React, { useMemo, useState } from 'react';
import { Plus, MessageSquare, Trash2, MoreVertical, Search, Clock, Bot, Activity, BrainCircuit, Pin, Edit2, Check, X as CloseIcon } from 'lucide-react';
import { useAppStore, ChatThread } from '@/store/useAppStore';
import { cn, safeDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

interface ChatSidebarProps {
  className?: string;
  onNewChat: () => void;
}

const getTopicTag = (title: string) => {
  const lower = (title || '').toLowerCase();
  if (lower.includes('blight') || lower.includes('spot') || lower.includes('rot')) return { label: 'Pathology', color: 'bg-destructive/10 text-destructive border-destructive/20' };
  if (lower.includes('soil') || lower.includes('ph') || lower.includes('fertilizer')) return { label: 'Agronomy', color: 'bg-warning/10 text-warning-foreground border-warning/20' };
  if (lower.includes('compound') || lower.includes('extract') || lower.includes('chemical')) return { label: 'Biochem', color: 'bg-secondary/10 text-secondary border-secondary/20' };
  return { label: 'General', color: 'bg-primary/10 text-primary border-primary/20' };
};

export default function ChatSidebar({ className, onNewChat }: ChatSidebarProps) {
  const { chatThreads, currentChatThreadId, setCurrentChatThreadId, deleteChatThread, updateChatThread, userName, userRole } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const groupedThreads = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const groups: { [key: string]: ChatThread[] } = {
      '📌 Pinned': [],
      'Today': [],
      'Previous 7 Days': [],
      'Older': []
    };

    const filtered = chatThreads.filter(t => (t.title || 'New Conversation').toLowerCase().includes(searchQuery.toLowerCase()));

    filtered.forEach(t => {
      if (t.is_pinned) {
        groups['📌 Pinned'].push(t);
        return;
      }
      const d = safeDate(t.created_at);
      if (d >= today) {
        groups['Today'].push(t);
      } else {
        const diffTime = Math.abs(today.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) groups['Previous 7 Days'].push(t);
        else groups['Older'].push(t);
      }
    });
    return groups;
  }, [chatThreads, searchQuery]);

  const handleRenameSubmit = async (e: React.FormEvent, threadId: string) => {
    e.preventDefault();
    if (editTitle.trim()) {
      await updateChatThread(threadId, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  return (
    <div className={cn("flex flex-col h-full bg-background/40 backdrop-blur-3xl border-r border-border/30 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.1)] relative", className)}>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none opacity-50" />
      
      <div className="p-4 relative z-10">
        <Button 
          onClick={onNewChat}
          className="w-full justify-start gap-3 h-12 rounded-2xl bg-card border border-border/50 hover:bg-accent/50 text-foreground font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] group"
        >
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Plus className="w-4 h-4 text-primary" />
          </div>
          New Research Chat
        </Button>
      </div>

      <div className="px-4 mb-2 relative z-10">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input 
            placeholder="Search threads..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-card/50 border border-border/50 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 mt-2 relative z-10">
        <div className="space-y-6 pb-4">
          {chatThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center opacity-40">
              <BrainCircuit className="w-8 h-8 mb-3" />
              <p className="text-xs font-medium">Workspace is empty</p>
            </div>
          ) : (
            Object.entries(groupedThreads).map(([groupName, threads]) => {
              if (threads.length === 0) return null;
              return (
                <div key={groupName} className="space-y-1.5">
                  <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2">
                    {groupName}
                  </h3>
                  {threads.map((thread) => {
                    const tag = getTopicTag(thread.title);
                    const isActive = currentChatThreadId === thread.id;
                    const isEditing = editingId === thread.id;

                    return (
                      <div
                        key={thread.id}
                        onClick={() => !isEditing && setCurrentChatThreadId(thread.id)}
                        className={cn(
                          "group relative flex items-center justify-between p-2.5 rounded-xl transition-all border",
                          !isEditing && "cursor-pointer",
                          isActive 
                            ? "bg-card border-primary/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] text-foreground" 
                            : "border-transparent hover:bg-card/40 text-muted-foreground hover:text-foreground hover:border-border/30"
                        )}
                      >
                        <div className="flex flex-col gap-1.5 overflow-hidden w-full">
                          {isEditing ? (
                            <form onSubmit={(e) => handleRenameSubmit(e, thread.id)} className="flex items-center gap-1">
                              <Input 
                                autoFocus
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                className="h-6 text-xs px-2 bg-background border-primary/50"
                              />
                              <Button type="submit" size="icon" variant="ghost" className="h-6 w-6 text-success hover:bg-success/20"><Check className="w-3 h-3" /></Button>
                              <Button type="button" size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-6 w-6 text-destructive hover:bg-destructive/20"><CloseIcon className="w-3 h-3" /></Button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-2 pr-6">
                              <span className={cn(
                                "text-xs font-medium truncate leading-tight flex-1",
                                isActive && "font-bold"
                              )}>
                                {thread.title}
                              </span>
                            </div>
                          )}
                          
                          {!isEditing && (
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-semibold tracking-wide", tag.color)}>
                                {tag.label}
                              </span>
                              <div className="flex items-center gap-1 text-[9px] opacity-50">
                                <Clock className="w-2.5 h-2.5" />
                                {safeDate(thread.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div className={cn(
                            "absolute right-2 top-2 opacity-0 transition-opacity",
                            isActive ? "opacity-100" : "group-hover:opacity-100"
                          )}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg bg-background/80 backdrop-blur hover:bg-accent border border-border/50">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36 rounded-xl border-border/50 bg-card/95 backdrop-blur-xl">
                                <DropdownMenuItem 
                                  className="cursor-pointer gap-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateChatThread(thread.id, { is_pinned: !thread.is_pinned });
                                  }}
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                  {thread.is_pinned ? 'Unpin' : 'Pin'}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="cursor-pointer gap-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditTitle(thread.title);
                                    setEditingId(thread.id);
                                  }}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteChatThread(thread.id);
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-background/50 backdrop-blur-xl border-t border-border/30 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            {userName ? userName[0].toUpperCase() : 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate capitalize">{userName || 'User'}</p>
            <p className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-wider">{userRole || 'Member'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
