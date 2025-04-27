import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useYouTubeSearch, getYouTubeVideoId, formatVideoDuration } from '@/lib/youtube';
import { User } from '../App';

interface PlaylistItem {
  id: number;
  playlistId: number;
  videoId: string;
  videoTitle?: string;
  videoThumbnail?: string;
  videoDuration?: string;
  order: number;
}

interface Playlist {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  items?: PlaylistItem[];
}

interface PlaylistProps {
  sessionId: number;
  currentVideoId: string;
  user: User;
}

export default function Playlist({ sessionId, currentVideoId, user }: PlaylistProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  
  // Get user playlists
  const { data: playlists, isLoading: isLoadingPlaylists } = useQuery<Playlist[]>({
    queryKey: ['/api/playlists'],
    enabled: !!user?.id,
  });
  
  // Get search results
  const { data: searchResults, isLoading: isSearching } = useYouTubeSearch(searchQuery);
  
  // Get the current playlist if one is selected
  const { data: currentPlaylist, isLoading: isLoadingPlaylistItems } = useQuery<Playlist>({
    queryKey: [`/api/playlists/${selectedPlaylistId}`],
    enabled: !!selectedPlaylistId,
  });
  
  // Update current video in session
  const updateSessionVideo = useMutation({
    mutationFn: async (videoId: string) => {
      return apiRequest('POST', `/api/sessions/${sessionId}/update-video`, { videoId });
    },
    onSuccess: () => {
      toast({
        title: 'Video changed',
        description: 'The video has been updated for everyone in the session',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}`] });
    },
    onError: () => {
      toast({
        title: 'Failed to change video',
        description: 'There was an error updating the video',
        variant: 'destructive',
      });
    }
  });
  
  // Create new playlist
  const createPlaylist = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('POST', '/api/playlists', { name });
    },
    onSuccess: (data) => {
      toast({
        title: 'Playlist created',
        description: 'Your new playlist has been created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/playlists'] });
      setSelectedPlaylistId(data.id);
      setIsCreatingPlaylist(false);
      setNewPlaylistName('');
    },
    onError: () => {
      toast({
        title: 'Failed to create playlist',
        description: 'There was an error creating your playlist',
        variant: 'destructive',
      });
    }
  });
  
  // Add video to playlist
  const addToPlaylist = useMutation({
    mutationFn: async ({ playlistId, videoId, videoTitle, videoThumbnail }: any) => {
      return apiRequest('POST', `/api/playlists/${playlistId}/items`, {
        videoId,
        videoTitle,
        videoThumbnail,
        videoDuration: '0:00' // This would ideally come from the API
      });
    },
    onSuccess: () => {
      toast({
        title: 'Video added',
        description: 'The video has been added to your playlist',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/playlists/${selectedPlaylistId}`] });
      setShowAddToPlaylist(false);
    },
    onError: () => {
      toast({
        title: 'Failed to add video',
        description: 'There was an error adding the video to your playlist',
        variant: 'destructive',
      });
    }
  });
  
  // Handle URL input
  const handleAddFromUrl = () => {
    const videoId = getYouTubeVideoId(videoUrl);
    if (videoId) {
      // Add to playlist or play directly
      setSelectedVideoId(videoId);
      setShowAddToPlaylist(true);
      setVideoUrl('');
    } else {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube URL',
        variant: 'destructive',
      });
    }
  };
  
  // Handle search item selection
  const handleSelectSearchItem = (videoId: string) => {
    setSelectedVideoId(videoId);
    setShowAddToPlaylist(true);
  };
  
  // Handle playing video directly
  const handlePlayVideo = (videoId: string) => {
    updateSessionVideo.mutate(videoId);
  };
  
  // Handle creating a new playlist
  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist.mutate(newPlaylistName);
    } else {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your playlist',
        variant: 'destructive',
      });
    }
  };
  
  // Handle adding to playlist
  const handleAddToPlaylist = (playlistId: number) => {
    if (!selectedVideoId) return;
    
    // Get video details from search results
    const videoDetails = searchResults?.items.find(item => item.id === selectedVideoId);
    
    addToPlaylist.mutate({
      playlistId,
      videoId: selectedVideoId,
      videoTitle: videoDetails?.title || 'Untitled Video',
      videoThumbnail: videoDetails?.thumbnailUrl || `https://i.ytimg.com/vi/${selectedVideoId}/mqdefault.jpg`,
    });
  };

  return (
    <div className="flex-grow flex flex-col p-4">
      {showAddToPlaylist ? (
        <div className="flex flex-col h-full">
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Add to playlist</h3>
            <div className="bg-gray-100 rounded-lg p-3 mb-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <img 
                    src={`https://i.ytimg.com/vi/${selectedVideoId}/mqdefault.jpg`}
                    className="w-20 h-12 object-cover rounded" 
                    alt="Video thumbnail"
                  />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {searchResults?.items.find(item => item.id === selectedVideoId)?.title || 'YouTube Video'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2 mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => setShowAddToPlaylist(false)}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                className="flex-1 bg-primary hover:bg-opacity-90"
                onClick={() => handlePlayVideo(selectedVideoId!)}
                disabled={updateSessionVideo.isPending}
              >
                {updateSessionVideo.isPending ? 'Updating...' : 'Play Now'}
              </Button>
            </div>
          </div>
          
          {isCreatingPlaylist ? (
            <form onSubmit={handleCreatePlaylist} className="mb-4">
              <h3 className="text-sm font-medium mb-2">Create new playlist</h3>
              <div className="flex space-x-2">
                <Input
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Playlist name"
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  size="sm"
                  className="bg-primary hover:bg-opacity-90"
                  disabled={createPlaylist.isPending}
                >
                  {createPlaylist.isPending ? 'Creating...' : 'Create'}
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsCreatingPlaylist(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              className="mb-4"
              onClick={() => setIsCreatingPlaylist(true)}
            >
              <i className="fas fa-plus mr-2"></i>
              Create New Playlist
            </Button>
          )}
          
          <h3 className="text-sm font-medium mb-2">Your playlists</h3>
          <ScrollArea className="flex-grow">
            {isLoadingPlaylists ? (
              <div className="py-4 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading playlists...</p>
              </div>
            ) : playlists && playlists.length > 0 ? (
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    className="w-full flex items-center p-3 text-left bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    onClick={() => handleAddToPlaylist(playlist.id)}
                    disabled={addToPlaylist.isPending}
                  >
                    <div className="w-8 h-8 bg-primary bg-opacity-20 flex items-center justify-center rounded mr-2">
                      <i className="fas fa-list text-primary"></i>
                    </div>
                    <div className="flex-grow">
                      <span className="block text-sm font-medium">{playlist.name}</span>
                    </div>
                    <i className="fas fa-plus text-gray-400"></i>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500">
                <p>No playlists yet</p>
                <p className="text-sm">Create your first playlist</p>
              </div>
            )}
          </ScrollArea>
        </div>
      ) : selectedPlaylistId && currentPlaylist ? (
        <div className="flex flex-col h-full">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">{currentPlaylist.name}</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedPlaylistId(null)}
            >
              <i className="fas fa-arrow-left mr-1"></i>
              Back
            </Button>
          </div>
          
          <ScrollArea className="flex-grow">
            {isLoadingPlaylistItems ? (
              <div className="py-4 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading videos...</p>
              </div>
            ) : currentPlaylist.items && currentPlaylist.items.length > 0 ? (
              <div className="space-y-3">
                {currentPlaylist.items.map((item) => (
                  <div 
                    key={item.id}
                    className={`bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition playlist-item cursor-pointer ${
                      item.videoId === currentVideoId ? 'border-2 border-primary' : ''
                    }`}
                    onClick={() => handlePlayVideo(item.videoId)}
                  >
                    <div className="relative">
                      <img 
                        src={item.videoThumbnail || `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`}
                        className="w-full h-24 object-cover" 
                        alt="Video thumbnail" 
                      />
                      <span className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                        {item.videoDuration || '0:00'}
                      </span>
                      {item.videoId === currentVideoId && (
                        <div className="absolute inset-0 bg-primary bg-opacity-20 flex items-center justify-center">
                          <div className="bg-white rounded-full p-1">
                            <i className="fas fa-play text-primary"></i>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <h3 className="text-sm font-medium line-clamp-1">{item.videoTitle || 'Untitled Video'}</h3>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500">
                <p>No videos in this playlist</p>
                <p className="text-sm">Add some videos to get started</p>
              </div>
            )}
          </ScrollArea>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="mb-4">
            <div className="relative">
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste YouTube URL..."
                className="pr-20"
              />
              <Button 
                className="absolute right-0 top-0 bg-primary hover:bg-opacity-90"
                size="sm"
                onClick={handleAddFromUrl}
                disabled={!videoUrl}
              >
                Add
              </Button>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos..."
                className="pl-9"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>
          
          {searchQuery ? (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Search Results</h3>
              <ScrollArea className="h-60">
                {isSearching ? (
                  <div className="py-4 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Searching...</p>
                  </div>
                ) : searchResults && searchResults.items.length > 0 ? (
                  <div className="space-y-3">
                    {searchResults.items.map((video) => (
                      <div 
                        key={video.id}
                        className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition playlist-item cursor-pointer"
                        onClick={() => handleSelectSearchItem(video.id)}
                      >
                        <div className="relative">
                          <img 
                            src={video.thumbnailUrl}
                            className="w-full h-24 object-cover" 
                            alt={video.title} 
                          />
                        </div>
                        <div className="p-2">
                          <h3 className="text-sm font-medium line-clamp-1">{video.title}</h3>
                          <p className="text-xs text-gray-500">{video.channelTitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-gray-500">
                    <p>No videos found</p>
                    <p className="text-sm">Try another search query</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : null}
          
          <h3 className="text-sm font-medium mb-2">Your Playlists</h3>
          <ScrollArea className="flex-grow">
            {isLoadingPlaylists ? (
              <div className="py-4 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading playlists...</p>
              </div>
            ) : playlists && playlists.length > 0 ? (
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    className="w-full flex items-center p-3 text-left bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    onClick={() => setSelectedPlaylistId(playlist.id)}
                  >
                    <div className="w-8 h-8 bg-primary bg-opacity-20 flex items-center justify-center rounded mr-2">
                      <i className="fas fa-list text-primary"></i>
                    </div>
                    <div className="flex-grow">
                      <span className="block text-sm font-medium">{playlist.name}</span>
                    </div>
                    <i className="fas fa-chevron-right text-gray-400"></i>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500">
                <p>No playlists yet</p>
                <Button 
                  onClick={() => setIsCreatingPlaylist(true)}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Create Playlist
                </Button>
              </div>
            )}
          </ScrollArea>
          
          {isCreatingPlaylist && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Create new playlist</h3>
              <form onSubmit={handleCreatePlaylist} className="flex space-x-2">
                <Input
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Playlist name"
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  size="sm"
                  className="bg-primary hover:bg-opacity-90"
                  disabled={createPlaylist.isPending}
                >
                  {createPlaylist.isPending ? 'Creating...' : 'Create'}
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsCreatingPlaylist(false)}
                >
                  Cancel
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
