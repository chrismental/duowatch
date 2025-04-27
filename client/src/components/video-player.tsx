import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import YouTube from 'react-youtube';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerProps {
  videoId: string;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  syncStatus: 'synced' | 'syncing' | 'out-of-sync';
}

const VideoPlayer = forwardRef<any, VideoPlayerProps>(({ 
  videoId, 
  onPlay, 
  onPause, 
  onSeek,
  syncStatus
}, ref) => {
  const playerRef = useRef<any>(null);
  const progressInterval = useRef<any>(null);
  const [playerState, setPlayerState] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const userInteractingRef = useRef(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Expose methods to the parent component
  useImperativeHandle(ref, () => ({
    playVideo: () => {
      if (playerRef.current) {
        playerRef.current.playVideo();
      }
    },
    pauseVideo: () => {
      if (playerRef.current) {
        playerRef.current.pauseVideo();
      }
    },
    seekTo: (seconds: number) => {
      if (playerRef.current) {
        playerRef.current.seekTo(seconds, true);
      }
    },
    getCurrentTime: () => {
      if (playerRef.current) {
        return playerRef.current.getCurrentTime();
      }
      return 0;
    },
    getDuration: () => {
      if (playerRef.current) {
        return playerRef.current.getDuration();
      }
      return 0;
    }
  }));

  // Handle player ready event
  const onReady = (event: any) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
    
    // Start progress tracking
    progressInterval.current = setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 1000);
  };

  // Handle player state changes
  const onStateChange = (event: any) => {
    setPlayerState(event.data);
    
    // YouTube API states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    if (event.data === 1) {
      setIsBuffering(false);
      onPlay();
    } else if (event.data === 2) {
      onPause();
    } else if (event.data === 3) {
      setIsBuffering(true);
    }
  };

  // Handle player errors
  const onError = (event: any) => {
    console.error('YouTube player error:', event.data);
  };

  // Toggle video playback
  const togglePlay = () => {
    if (playerRef.current) {
      if (playerState === 1) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  // Seek video
  const handleSeek = (value: number[]) => {
    if (playerRef.current) {
      const newTime = value[0];
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
      onSeek(newTime);
    }
  };

  // Format time display (convert seconds to MM:SS format)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle mute
  const toggleMute = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    if (playerRef.current) {
      const newVolume = value[0];
      playerRef.current.setVolume(newVolume);
      setVolume(newVolume);
      
      if (newVolume === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  // Rewind 10 seconds
  const rewind = () => {
    if (playerRef.current) {
      const newTime = Math.max(0, currentTime - 10);
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
      onSeek(newTime);
    }
  };

  // Forward 10 seconds
  const forward = () => {
    if (playerRef.current) {
      const newTime = Math.min(duration, currentTime + 10);
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
      onSeek(newTime);
    }
  };

  // Show/hide controls on mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      if (!userInteractingRef.current) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };
    
    const handleMouseLeave = () => {
      if (!userInteractingRef.current) {
        setShowControls(false);
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);

  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);
  
  // YouTube player options
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      controls: 0,
      disablekb: 1,
      rel: 0,
      showinfo: 0,
      enablejsapi: 1,
      origin: window.location.origin,
    },
  };

  return (
    <div className="relative bg-dark rounded-xl overflow-hidden shadow-lg mb-4" ref={containerRef}>
      <div className="video-container">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onStateChange={onStateChange}
          onError={onError}
          className="w-full h-full"
        />
        
        {/* Loading overlay */}
        {isBuffering && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      
      {/* Video controls */}
      {showControls && (
        <div className="video-controls absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 flex flex-col">
          {/* Progress bar */}
          <div 
            className="relative h-1 bg-gray-600 rounded-full mb-2 cursor-pointer group"
            onClick={(e) => {
              if (!userInteractingRef.current && playerRef.current) {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                const newTime = percent * duration;
                playerRef.current.seekTo(newTime, true);
                setCurrentTime(newTime);
                onSeek(newTime);
              }
            }}
          >
            <Slider 
              value={[currentTime]} 
              max={duration}
              step={1}
              onValueChange={handleSeek}
              onValueCommitStart={() => { userInteractingRef.current = true; }}
              onValueCommitEnd={() => { userInteractingRef.current = false; }}
              className="h-1"
            />
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <button className="hover:text-primary transition" onClick={togglePlay}>
                <i className={`fas ${playerState === 1 ? 'fa-pause' : 'fa-play'}`}></i>
              </button>
              <button className="hover:text-primary transition" onClick={rewind}>
                <i className="fas fa-backward"></i>
              </button>
              <button className="hover:text-primary transition" onClick={forward}>
                <i className="fas fa-forward"></i>
              </button>
              <div className="hidden sm:flex items-center space-x-2">
                <button className="hover:text-primary transition" onClick={toggleMute}>
                  <i className={`fas ${isMuted ? 'fa-volume-mute' : volume > 50 ? 'fa-volume-up' : 'fa-volume-down'}`}></i>
                </button>
                <div className="w-16 relative">
                  <Slider 
                    value={[isMuted ? 0 : volume]} 
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    onValueCommitStart={() => { userInteractingRef.current = true; }}
                    onValueCommitEnd={() => { userInteractingRef.current = false; }}
                    className="h-1"
                  />
                </div>
              </div>
              <span className="text-xs sm:text-sm">
                <span>{formatTime(currentTime)}</span> / <span>{formatTime(duration)}</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                className={`text-white transition ${syncStatus === 'synced' ? 'text-primary' : 'hover:text-primary'}`} 
                title="Sync with partner"
              >
                <i className={`fas fa-sync-alt ${syncStatus === 'syncing' ? 'animate-spin' : syncStatus === 'synced' ? 'animate-pulse' : ''}`}></i>
              </button>
              <button className="text-white hover:text-primary transition" onClick={toggleFullscreen}>
                <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
