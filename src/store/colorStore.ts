import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Color = 'red' | 'blue' | 'yellow' | 'purple';

interface ColorState {
  color: Color;
  setColor: (newColor: Color) => void;
}

const useColorStore = create<
  ColorState,
  [['zustand/persist', ColorState]] // 미들웨어 타입 추가
>(
  persist(
    set => ({
      color: 'blue', // default color
      setColor: (newColor: Color) => set({ color: newColor }),
    }),
    {
      name: 'color-storage', // name of the item in the storage
    },
  ),
);

export default useColorStore;
