import { create } from 'zustand';

interface ClickState {
  x: number;
  y: number;
  content: string;
  movecost: number;
  setMovecost: (movecost: number) => void;
  setPosition: (x: number, y: number, content: string) => void;
}

const useClickStore = create<ClickState>(set => ({
  x: -1,
  y: -1,
  content: '',
  movecost: 0,
  setMovecost: movecost => set({ movecost }),
  setPosition: (x, y, content) => set({ x, y, content }),
}));

export default useClickStore;
