import { create } from 'zustand';

interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: number;
}

interface AdminState {
  realtimeEvents: RealtimeEvent[];
  isConnected: boolean;
  addEvent: (event: Omit<RealtimeEvent, 'timestamp'>) => void;
  setConnectionStatus: (status: boolean) => void;
  clearEvents: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  realtimeEvents: [],
  isConnected: false,
  addEvent: (event) => set((state) => ({
    realtimeEvents: [
      { ...event, timestamp: Date.now() },
      ...state.realtimeEvents
    ].slice(0, 100) // Keep last 100 events
  })),
  setConnectionStatus: (status) => set({ isConnected: status }),
  clearEvents: () => set({ realtimeEvents: [] })
}));
