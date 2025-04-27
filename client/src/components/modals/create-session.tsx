import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { getYouTubeVideoId } from '@/lib/youtube';
import { User } from '../../App';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function CreateSessionModal({ isOpen, onClose, user }: CreateSessionModalProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sessionName, setSessionName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [scheduleSession, setScheduleSession] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [videoDetails, setVideoDetails] = useState<{ title?: string, thumbnail?: string } | null>(null);
  const [isLoadingVideoDetails, setIsLoadingVideoDetails] = useState(false);
  const [videoError, setVideoError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSessionName('');
      setVideoUrl('');
      setPartnerName('');
      setScheduleSession(false);
      setScheduleDate('');
      setScheduleTime('');
      setVideoDetails(null);
      setVideoError('');
    }
  }, [isOpen]);

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/sessions', data);
    },
    onSuccess: (data) => {
      toast({
        title: 'Session created!',
        description: 'Your watching session has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      onClose();
      navigate(`/watch/${data.id}`);
    },
    onError: () => {
      toast({
        title: 'Failed to create session',
        description: 'There was an error creating your session. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Handle video URL changes and fetch video details
  useEffect(() => {
    const fetchVideoDetails = async (videoId: string) => {
      setIsLoadingVideoDetails(true);
      setVideoError('');
      try {
        const res = await fetch(`/api/youtube/videos/${videoId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch video details');
        }
        const data = await res.json();
        setVideoDetails({
          title: data.snippet.title,
          thumbnail: data.snippet.thumbnails.medium.url,
        });
      } catch (error) {
        console.error('Error fetching video details:', error);
        setVideoError('Could not load video details. Please check the URL.');
        setVideoDetails(null);
      } finally {
        setIsLoadingVideoDetails(false);
      }
    };

    if (videoUrl) {
      const videoId = getYouTubeVideoId(videoUrl);
      if (videoId) {
        fetchVideoDetails(videoId);
      } else {
        setVideoError('Invalid YouTube URL');
        setVideoDetails(null);
      }
    } else {
      setVideoDetails(null);
      setVideoError('');
    }
  }, [videoUrl]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to create a session',
        variant: 'destructive',
      });
      return;
    }
    
    if (!sessionName.trim()) {
      toast({
        title: 'Session name required',
        description: 'Please enter a name for your session',
        variant: 'destructive',
      });
      return;
    }
    
    const videoId = getYouTubeVideoId(videoUrl);
    if (!videoId) {
      toast({
        title: 'Invalid YouTube URL',
        description: 'Please enter a valid YouTube video URL',
        variant: 'destructive',
      });
      return;
    }
    
    // Create session data
    const sessionData = {
      name: sessionName,
      videoId,
      videoTitle: videoDetails?.title,
      videoThumbnail: videoDetails?.thumbnail,
    };
    
    createSession.mutate(sessionData);
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
            <DialogDescription>
              Please log in or create an account to create a watching session.
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
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Start a new watching session with your partner.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="sessionName">Session Name</Label>
              <Input
                id="sessionName"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. Movie Night with Alex"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste YouTube link here"
                required
              />
              {videoError && (
                <p className="text-red-500 text-xs mt-1">{videoError}</p>
              )}
              
              {isLoadingVideoDetails && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span>Loading video details...</span>
                </div>
              )}
              
              {videoDetails && (
                <div className="border border-gray-200 rounded-lg p-3 mt-2">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <img 
                        src={videoDetails.thumbnail}
                        className="w-20 h-12 object-cover rounded" 
                        alt="Video thumbnail"
                      />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{videoDetails.title}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="partnerName">Invite Partner (Optional)</Label>
              <div className="relative">
                <Input
                  id="partnerName"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="Enter email or username"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-address-book"></i>
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="scheduleSession"
                checked={scheduleSession}
                onCheckedChange={(checked) => setScheduleSession(!!checked)}
              />
              <Label htmlFor="scheduleSession" className="text-sm">Schedule for later</Label>
            </div>
            
            {scheduleSession && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="scheduleDate">Date</Label>
                  <Input
                    id="scheduleDate"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduleTime">Time</Label>
                  <Input
                    id="scheduleTime"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <p><i className="fas fa-info-circle mr-1 text-primary"></i> Your partner will receive an invitation to join this session.</p>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createSession.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-opacity-90"
              disabled={createSession.isPending || isLoadingVideoDetails || !!videoError}
            >
              {createSession.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Session'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
