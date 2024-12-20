import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Color = 'red' | 'blue' | 'yellow' | 'purple';

interface CursorState {
  x: number;
  y: number;
  color: Color;
}

interface ClientCursorState extends CursorState {
  originX: number;
  originY: number;
  setColor: (newColor: Color) => void;
  setPosition: (x: number, y: number) => void;
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
  setOringinPosition: (x: number, y: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
}

interface OtherUserCursorsState {
  cursors: CursorState[];
  addCursor: (cursor: CursorState) => void;
  removeCursor: (cursor: CursorState) => void;
  setCursors: (cursors: CursorState[]) => void;
}

export const useCursorStore = create<
  ClientCursorState,
  [['zustand/persist', ClientCursorState]] // 미들웨어 타입 추가
>(
  persist<ClientCursorState>(
    set => ({
      x: 0,
      y: 0,
      color: 'blue',
      originX: 0,
      originY: 0,
      zoom: 1,
      setColor: color => set({ color }),
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

export const useOtherUserCursorsStore = create<OtherUserCursorsState>(set => ({
  cursors: [],
  addCursor: cursor => set(state => ({ cursors: [...state.cursors, cursor] })),
  removeCursor: cursor => set(state => ({ cursors: state.cursors.filter(c => c !== cursor) })),
  setCursors: cursors => set({ cursors }),
}));
