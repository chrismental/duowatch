import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useWebSocket, sendVideoSync, sendChatMessage } from '@/lib/websocket';
import VideoPlayer from '@/components/video-player';
import Chat from '@/components/chat';
import Playlist from '@/components/playlist';
import { useToast } from '@/hooks/use-toast';
import { type WsMessage } from '@shared/schema';

type TabType = 'chat' | 'playlist';

export default function Watch() {
  const { sessionId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef<any>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'out-of-sync'>('synced');
  const [messages, setMessages] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const lastUserActionRef = useRef<{action: string, time: number}>({ action: '', time: 0 });

  // Check if user is logged in
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          navigate('/');
          toast({
            title: "Authentication required",
            description: "Please log in to access this session",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    }
    
    checkAuth();
  }, [navigate, toast]);

  // Fetch session details
  const { data: session, isLoading: isLoadingSession, isError: isSessionError } = useQuery({
    queryKey: [`/api/sessions/${sessionId}`],
    enabled: !!sessionId && !!user?.id,
  });

  // Fetch session messages
  const { data: initialMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: [`/api/sessions/${sessionId}/messages`],
    enabled: !!sessionId && !!user?.id,
    onSuccess: (data) => {
      setMessages(data || []);
    }
  });

  // Fetch session participants
  const { data: initialParticipants, isLoading: isLoadingParticipants } = useQuery({
    queryKey: [`/api/sessions/${sessionId}/participants`],
    enabled: !!sessionId && !!user?.id,
    onSuccess: (data) => {
      setParticipants(data || []);
    }
  });

  // Join session mutation
  const joinSession = useMutation({
    mutationFn: async () => {
      if (!sessionId || !user) return null;
      return apiRequest('POST', `/api/sessions/${sessionId}/join`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: [`/api/sessions/${sessionId}/participants`]});
    }
  });

  // Leave session mutation
  const leaveSession = useMutation({
    mutationFn: async () => {
      if (!sessionId || !user) return null;
      return apiRequest('POST', `/api/sessions/${sessionId}/leave`, {});
    }
  });

  // Join session automatically when user and session are available
  useEffect(() => {
    if (user?.id && sessionId && !joinSession.isPending) {
      joinSession.mutate();
    }
  }, [user, sessionId, joinSession]);

  // Leave session on unmount
  useEffect(() => {
    return () => {
      if (user?.id && sessionId) {
        leaveSession.mutate();
      }
    };
  }, [user, sessionId, leaveSession]);

  // Handle WebSocket messages
  const handleWsMessage = (message: WsMessage) => {
    switch (message.type) {
      case 'videoSync': {
        // Ignore our own actions
        const now = Date.now();
        if (
          lastUserActionRef.current.action === message.action && 
          now - lastUserActionRef.current.time < 1000
        ) {
          return;
        }
        
        if (playerRef.current) {
          setSyncStatus('syncing');
          
          if (message.action === 'play') {
            playerRef.current.playVideo();
          } else if (message.action === 'pause') {
            playerRef.current.pauseVideo();
          } else if (message.action === 'seek' && typeof message.currentTime === 'number') {
            playerRef.current.seekTo(message.currentTime);
          }
          
          setTimeout(() => {
            setSyncStatus('synced');
          }, 1000);
        }
        break;
      }
      
      case 'chat': {
        const newMessage = {
          id: `temp-${Date.now()}`,
          sessionId: message.sessionId,
          userId: message.userId,
          content: message.message,
          sentAt: new Date(message.timestamp),
          user: {
            id: message.userId,
            username: message.username
          }
        };
        
        setMessages((prev) => [...prev, newMessage]);
        break;
      }
      
      case 'sessionUpdate': {
        // Update participants list
        console.log('Session update:', message);
        // We'd need to fetch full participant details here
        queryClient.invalidateQueries({queryKey: [`/api/sessions/${sessionId}/participants`]});
        break;
      }
    }
  };

  // Setup WebSocket
  const { sendMessage } = useWebSocket(
    sessionId ? parseInt(sessionId) : null,
    user?.id || null,
    handleWsMessage
  );

  // Handle video player events
  const handlePlayerPlay = () => {
    if (session && user) {
      lastUserActionRef.current = { action: 'play', time: Date.now() };
      sendVideoSync(sendMessage, parseInt(sessionId), 'play');
    }
  };

  const handlePlayerPause = () => {
    if (session && user) {
      lastUserActionRef.current = { action: 'pause', time: Date.now() };
      sendVideoSync(sendMessage, parseInt(sessionId), 'pause');
    }
  };

  const handlePlayerSeek = (time: number) => {
    if (session && user) {
      lastUserActionRef.current = { action: 'seek', time: Date.now() };
      sendVideoSync(sendMessage, parseInt(sessionId), 'seek', time);
    }
  };

  // Send a chat message
  const handleSendMessage = (content: string) => {
    if (!user || !session || !content.trim()) return;
    
    // Optimistically add message to UI
    const tempMessage = {
      id: `temp-${Date.now()}`,
      sessionId: parseInt(sessionId),
      userId: user.id,
      content,
      sentAt: new Date(),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl
      }
    };
    
    setMessages((prev) => [...prev, tempMessage]);
    
    // Send via WebSocket for real-time updates
    sendChatMessage(sendMessage, parseInt(sessionId), user.id, user.username, content);
    
    // Also save to the database
    apiRequest('POST', `/api/sessions/${sessionId}/messages`, { content })
      .then(() => {
        queryClient.invalidateQueries({queryKey: [`/api/sessions/${sessionId}/messages`]});
      })
      .catch((error) => {
        console.error('Failed to send message:', error);
        // Remove the optimistic message
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
        toast({
          title: "Failed to send message",
          description: "Please try again",
          variant: "destructive"
        });
      });
  };

  // Handle fullscreen toggle
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Loading state
  if (isLoadingSession || isLoadingMessages || isLoadingParticipants || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Error state
  if (isSessionError || !session) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <div className="mb-6">
          <span className="inline-block p-3 rounded-full bg-red-100 text-red-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Session Not Found</h1>
        <p className="text-gray-600 mb-6">The session you're looking for doesn't exist or has ended.</p>
        <Button onClick={() => navigate('/')} className="bg-primary hover:bg-opacity-90">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white shadow-sm z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span onClick={() => navigate('/')} className="text-2xl font-bold font-heading gradient-text cursor-pointer">DuoWatch</span>
            <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">BETA</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-2">
            <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-600">
              <span className="flex items-center">
                <i className="fas fa-users mr-2"></i>
                <span>{session.name}</span>
                <span className="mx-2">•</span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  <span>{participants.length} viewers</span>
                </span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/')}
              className="text-sm"
            >
              <i className="fas fa-arrow-left mr-1"></i>
              Exit
            </Button>
            
            <div className="flex items-center space-x-2">
              <img 
                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                alt={user.displayName || user.username} 
                className="w-8 h-8 rounded-full border-2 border-accent"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col md:flex-row bg-light">
        <div className="flex-grow flex flex-col p-4 lg:p-6">
          <div className="mb-4 flex flex-col-reverse md:flex-row md:items-center md:justify-between">
            <h1 className="text-xl lg:text-2xl font-bold font-heading mt-2 md:mt-0">{session.videoTitle || 'Untitled Video'}</h1>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({
                  title: "Link copied!",
                  description: "Share this link with your partner to watch together",
                });
              }}>
                <i className="fas fa-copy mr-1"></i>
                Copy Link
              </Button>
              
              <div className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm flex items-center space-x-1">
                <i className="fas fa-eye"></i>
                <span>{participants.length}</span>
              </div>
            </div>
          </div>

          <VideoPlayer 
            videoId={session.videoId} 
            onPlay={handlePlayerPlay}
            onPause={handlePlayerPause}
            onSeek={handlePlayerSeek}
            syncStatus={syncStatus}
            ref={playerRef}
          />
        </div>
        
        <div className="w-full md:w-80 lg:w-96 border-l border-gray-200 bg-white flex flex-col">
          <div className="flex items-center border-b border-gray-200">
            <button 
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === 'chat' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('chat')}
            >
              <i className="fas fa-comments mr-2"></i>
              Chat
            </button>
            <button 
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === 'playlist' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('playlist')}
            >
              <i className="fas fa-list-ul mr-2"></i>
              Playlist
            </button>
          </div>
          
          {activeTab === 'chat' ? (
            <Chat 
              messages={messages}
              participants={participants}
              currentUser={user}
              onSendMessage={handleSendMessage}
            />
          ) : (
            <Playlist 
              sessionId={parseInt(sessionId)}
              currentVideoId={session.videoId}
              user={user}
            />
          )}
        </div>
      </main>
    </div>
  );
}
