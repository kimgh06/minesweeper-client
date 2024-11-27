import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ColorState {
  color: string;
  setColor: (newColor: string) => void;
}

const useColorStore = create<
  ColorState,
  [['zustand/persist', ColorState]] // 미들웨어 타입 추가
>(
  persist(
    set => ({
      color: 'blue', // default color
      setColor: (newColor: string) => set({ color: newColor }),
    }),
    {
      name: 'color-storage', // name of the item in the storage
    },
  ),
);

export default useColorStore;
