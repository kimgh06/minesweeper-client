import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  zoom: number;
  setZoom: (zoom: number) => void;
}

const useCursorStore = create<
  CursorState,
  [['zustand/persist', CursorState]] // 미들웨어 타입 추가
>(
  persist<CursorState>(
    set => ({
      x: 0,
      y: 0,
      zoom: 1,
      setX: x => set({ x }),
      setY: y => set({ y }),
      setZoom: zoom => set({ zoom }),
      goup: () => set(state => ({ y: state.y - 1 })),
      godown: () => set(state => ({ y: state.y + 1 })),
      goleft: () => set(state => ({ x: state.x - 1 })),
      goright: () => set(state => ({ x: state.x + 1 })),
      setPosition: (x, y) => set({ x, y }),
    }),
    {
      name: 'cursor-storage', // localStorage에 저장될 키 이름
    },
  ),
);

export default useCursorStore;
