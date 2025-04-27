import { useEffect, useRef, useCallback } from 'react';
import { type WsMessage } from '@shared/schema';

export function useWebSocket(
  sessionId: number | null,
  userId: number | null,
  onMessage: (message: WsMessage) => void
) {
  const socketRef = useRef<WebSocket | null>(null);
  
  // Initialize connection
  useEffect(() => {
    if (!sessionId || !userId) return;
    
    // Close any existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Establish new connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
    
    socketRef.current = socket;
    
    // Clean up on unmount
    return () => {
      socket.close();
    };
  }, [sessionId, userId, onMessage]);
  
  // Send message function
  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);
  
  return { sendMessage };
}

// Helper function to send video sync messages
export function sendVideoSync(
  sendMessage: (message: any) => void,
  sessionId: number,
  action: 'play' | 'pause' | 'seek',
  currentTime?: number
) {
  const message = {
    type: 'videoSync',
    sessionId,
    action,
    timestamp: Date.now(),
    currentTime
  };
  
  sendMessage(message);
}

// Helper function to send chat messages
export function sendChatMessage(
  sendMessage: (message: any) => void,
  sessionId: number,
  userId: number,
  username: string,
  message: string
) {
  const chatMessage = {
    type: 'chat',
    sessionId,
    userId,
    username,
    message,
    timestamp: Date.now()
  };
  
  sendMessage(chatMessage);
}
