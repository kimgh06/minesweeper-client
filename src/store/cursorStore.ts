import { create } from 'zustand';

interface CursorState {
  x: number;
  y: number;
  setX: (x: number) => void;
  setY: (y: number) => void;
  setPosition: (x: number, y: number) => void;
}

const useCursorStore = create<CursorState>(set => ({
  x: 0,
  y: 0,
  setX: x => set({ x }),
  setY: y => set({ y }),
  setPosition: (x, y) => set({ x, y }),
}));

export default useCursorStore;
