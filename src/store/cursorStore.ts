import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CursorState {
  x: number;
  y: number;
  originX: number;
  originY: number;
  setX: (x: number) => void;
  setY: (y: number) => void;
  goup: () => void;
  godown: () => void;
  goleft: () => void;
  goright: () => void;
  goUpLeft: () => void;
  goUpRight: () => void;
  goDownLeft: () => void;
  goDownRight: () => void;
  setPosition: (x: number, y: number) => void;
  setOringinPosition: (x: number, y: number) => void;
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
      originX: 0,
      originY: 0,
      zoom: 1,
      setX: x => set({ x }),
      setY: y => set({ y }),
      setZoom: zoom => set({ zoom }),
      goup: () => set(state => ({ originY: state.originY - 1 })),
      godown: () => set(state => ({ originY: state.originY + 1 })),
      goleft: () => set(state => ({ originX: state.originX - 1 })),
      goright: () => set(state => ({ originX: state.originX + 1 })),
      goUpLeft: () => set(state => ({ originX: state.originX - 1, originY: state.originY - 1 })),
      goUpRight: () => set(state => ({ originX: state.originX + 1, originY: state.originY - 1 })),
      goDownLeft: () => set(state => ({ originX: state.originX - 1, originY: state.originY + 1 })),
      goDownRight: () => set(state => ({ originX: state.originX + 1, originY: state.originY + 1 })),
      setOringinPosition: (x, y) => set({ originX: x, originY: y }),
      setPosition: (x, y) => set({ x, y }),
    }),
    {
      name: 'cursor-storage', // localStorage에 저장될 키 이름
    },
  ),
);

export default useCursorStore;
