import { create } from 'zustand';

export type SceneState = 'hero' | 'dashboard' | 'lab' | 'insights';

interface UIStore {
  currentScene: SceneState;
  setScene: (scene: SceneState) => void;
  isModelLoading: boolean;
  setModelLoading: (loading: boolean) => void;
  isScanning: boolean;
  setScanning: (scanning: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  currentScene: 'hero',
  setScene: (scene) => set({ currentScene: scene }),
  isModelLoading: false,
  setModelLoading: (loading) => set({ isModelLoading: loading }),
  isScanning: false,
  setScanning: (scanning) => set({ isScanning: scanning }),
}));
