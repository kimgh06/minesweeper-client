import { create } from 'zustand';

interface WebSocketState {
  socket: WebSocket | null;
  isOpen: boolean;
  connect: (url: string) => void;
  disconnect: () => void;
  sendMessage: (message: string) => void;
  message: string;
}

const useWebSocketStore = create<WebSocketState>(set => ({
  socket: null,
  message: '',
  isOpen: false,
  connect: (url: string) => {
    const socket = new WebSocket(url);
    socket.onopen = () => set({ socket, isOpen: true });
    socket.onclose = () => console.log('WebSocket disconnected');
    socket.onmessage = event => set({ message: event.data });
  },
  disconnect: () => {
    set(state => {
      state.socket?.close();
      return { socket: null, isOpen: false };
    });
  },
  sendMessage: (message: string) => {
    if (!message) return;
    set(state => {
      if (!state.isOpen) return {};
      state.socket?.send(message);
      return {};
    });
  },
}));

export default useWebSocketStore;
