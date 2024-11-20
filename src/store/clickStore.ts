import { create } from 'zustand';

interface ClickState {
  x: number;
  y: number;
  content: string;
  setPosition: (x: number, y: number, content: string) => void;
}

const useClickStore = create<ClickState>(set => ({
  x: 0,
  y: 0,
  content: '',
  setPosition: (x, y, content) => set({ x, y, content }),
}));

export default useClickStore;
