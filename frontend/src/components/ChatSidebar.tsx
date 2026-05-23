import React from 'react';
import { Plus, MessageSquare, Trash2, MoreVertical, Search, Clock } from 'lucide-react';
import { useAppStore, ChatThread } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

interface ChatSidebarProps {
  className?: string;
  onNewChat: () => void;
}

export default function ChatSidebar({ className, onNewChat }: ChatSidebarProps) {
  const { chatThreads, currentChatThreadId, setCurrentChatThreadId, deleteChatThread } = useAppStore();

  return (
    <div className={cn("flex flex-col h-full bg-card/30 backdrop-blur-md border-r border-border/50", className)}>
      <div className="p-4">
        <Button 
          onClick={onNewChat}
          className="w-full justify-start gap-2 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          New Conversation
        </Button>
      </div>

      <div className="px-4 mb-2">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input 
            placeholder="Search chats..." 
            className="w-full bg-accent/50 border-none rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-primary/30 outline-none transition-all"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1.5 py-2">
          {chatThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center opacity-40">
              <MessageSquare className="w-8 h-8 mb-2" />
              <p className="text-xs font-medium">No conversations yet</p>
            </div>
          ) : (
            chatThreads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => setCurrentChatThreadId(thread.id)}
                className={cn(
                  "group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                  currentChatThreadId === thread.id 
                    ? "bg-primary/10 border-primary/20 text-primary shadow-sm" 
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    currentChatThreadId === thread.id ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate leading-tight">
                      {thread.title}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] opacity-60 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(thread.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32 rounded-xl">
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChatThread(thread.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Separator className="bg-border/50" />
      
      <div className="p-4 bg-accent/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-primary-foreground/20" />
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold truncate">Premium Researcher</p>
            <p className="text-[10px] text-muted-foreground truncate italic">AgriCosmo Pro</p>
          </div>
        </div>
      </div>
    </div>
  );
}
