import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL } from '../utils/constants';

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  onMessage?: (data: unknown) => void;
  reconnectDelay?: number;
  maxRetries?: number;
}

export function useWebSocket(path: string, options: UseWebSocketOptions = {}) {
  const { onMessage, reconnectDelay = 3000, maxRetries = 10 } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const url = `${WS_URL}${path}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setStatus('connecting');

      ws.onopen = () => {
        setStatus('connected');
        retriesRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch {
          setLastMessage(event.data);
        }
      };

      ws.onerror = () => setStatus('error');

      ws.onclose = () => {
        setStatus('disconnected');
        if (retriesRef.current < maxRetries) {
          retriesRef.current++;
          const delay = reconnectDelay * Math.pow(1.5, retriesRef.current - 1);
          timeoutRef.current = setTimeout(connect, delay);
        }
      };
    } catch {
      setStatus('error');
    }
  }, [path, onMessage, reconnectDelay, maxRetries]);

  useEffect(() => {
    connect();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { status, send, lastMessage };
}
