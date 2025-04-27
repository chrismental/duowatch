import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { User } from '../../App';

interface JoinSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number | null;
  user: User | null;
}

export function JoinSessionModal({ isOpen, onClose, sessionId, user }: JoinSessionModalProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch session details
  const { data: session, isLoading, error } = useQuery({
    queryKey: [`/api/sessions/${sessionId}`],
    enabled: isOpen && !!sessionId,
  });

  // Join session mutation
  const joinSession = useMutation({
    mutationFn: async () => {
      if (!sessionId || !user) return null;
      return apiRequest('POST', `/api/sessions/${sessionId}/join`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}/participants`] });
      onClose();
      navigate(`/watch/${sessionId}`);
    },
    onError: () => {
      toast({
        title: 'Failed to join session',
        description: 'There was an error joining the session. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Handle join button click
  const handleJoin = () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to join a session',
        variant: 'destructive',
      });
      return;
    }
    
    joinSession.mutate();
  };

  // Schedule for later (placeholder)
  const handleSchedule = () => {
    toast({
      title: 'Coming soon',
      description: 'Scheduling for later will be available soon!',
    });
    onClose();
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
            <DialogDescription>
              Please log in or create an account to join a watching session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {isLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading session details...</p>
          </div>
        ) : error || !session ? (
          <div className="py-6 text-center">
            <span className="inline-block p-3 rounded-full bg-red-100 text-red-500 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <DialogHeader>
              <DialogTitle>Session Not Found</DialogTitle>
              <DialogDescription>
                The session you're trying to join doesn't exist or has ended.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <span className="inline-block w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mb-2">
                <i className="fas fa-link text-primary text-2xl"></i>
              </span>
              <DialogHeader>
                <DialogTitle>Join "{session.name}"</DialogTitle>
                <DialogDescription>
                  {session.hostId === user.id 
                    ? 'This is your session' 
                    : `Created by User ${session.hostId}`}
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <img 
                    src={session.videoThumbnail || `https://i.ytimg.com/vi/${session.videoId}/mqdefault.jpg`}
                    className="w-20 h-12 object-cover rounded" 
                    alt="Video thumbnail"
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {session.videoTitle || 'YouTube Video'}
                  </p>
                  <p className="text-xs text-gray-500">Video ID: {session.videoId}</p>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleJoin}
              className="w-full py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 flex items-center justify-center"
              disabled={joinSession.isPending}
            >
              {joinSession.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Joining...
                </div>
              ) : (
                <>
                  <i className="fas fa-play-circle mr-2"></i>
                  Join Now
                </>
              )}
            </Button>
            
            <div className="mt-3 text-center">
              <button 
                className="text-sm text-gray-600 hover:text-primary"
                onClick={handleSchedule}
              >
                Schedule for later
              </button>
            </div>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
