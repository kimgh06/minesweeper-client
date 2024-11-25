import { create } from 'zustand';

interface CursorState {
  x: number;
  y: number;
  setX: (x: number) => void;
  setY: (y: number) => void;
  goup: () => void;
  godown: () => void;
  goleft: () => void;
  goright: () => void;
  setPosition: (x: number, y: number) => void;
}

const useCursorStore = create<CursorState>(set => ({
  x: 0,
  y: 0,
  setX: x => set({ x }),
  setY: y => set({ y }),
  goup: () => set(state => ({ y: state.y - 1 })),
  godown: () => set(state => ({ y: state.y + 1 })),
  goleft: () => set(state => ({ x: state.x - 1 })),
  goright: () => set(state => ({ x: state.x + 1 })),
  setPosition: (x, y) => set({ x, y }),
}));

export default useCursorStore;
