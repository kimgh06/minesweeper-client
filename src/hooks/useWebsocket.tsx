import { useEffect, useRef, useState } from 'react';

const useWebSocket = (url: string) => {
  const [message, setMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setIsOpen(true);
    };

    ws.current.onmessage = event => {
      setMessage(event.data);
    };

    ws.current.onclose = () => {
      setIsOpen(false);
    };

    ws.current.onerror = error => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  const sendMessage = (msg: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(msg);
    } else {
      console.error('WebSocket is not open');
    }
  };

  return { message, isOpen, sendMessage };
};

export default useWebSocket;
