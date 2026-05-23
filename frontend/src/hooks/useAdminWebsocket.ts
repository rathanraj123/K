import { useEffect, useRef } from 'react';
import { useAdminStore } from '../store/adminStore';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useAdminWebsocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const { addEvent, setConnectionStatus } = useAdminStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;
    
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? `${protocol}//${window.location.host}/ws`
        : 'ws://127.0.0.1:8000/ws';

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        if (!isMounted) return;
        console.log('Admin WebSocket Connected');
        setConnectionStatus(true);
        reconnectAttempt.current = 0; // Reset backoff
        
        // Start heartbeat
        pingInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.current.onclose = () => {
        if (!isMounted) return;
        console.log('Admin WebSocket Disconnected');
        setConnectionStatus(false);
        if (pingInterval.current) clearInterval(pingInterval.current);
        
        // Exponential backoff reconnect (max 30s)
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000);
        reconnectAttempt.current += 1;
        
        setTimeout(() => {
          if (isMounted) connect();
        }, timeout);
      };

      ws.current.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'pong') return; // Ignore heartbeat responses
          
          if (data.type === 'admin_notification') {
            const level = data.data?.level || 'info';
            const msg = data.data?.message || 'New notification';
            if (level === 'error') toast.error(msg);
            else if (level === 'success') toast.success(msg);
            else if (level === 'warning') toast.warning(msg);
            else toast.info(msg);
          } else {
            addEvent({ type: data.type, data: data.data });
          }

          if (data.type === 'scan_upload' || data.type === 'analytics_update') {
              queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
              queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
              queryClient.invalidateQueries({ queryKey: ['admin-scans'] });
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (pingInterval.current) clearInterval(pingInterval.current);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [addEvent, setConnectionStatus, queryClient]);

  return ws.current;
}
