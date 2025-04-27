// YouTube API client
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
}

export interface YouTubeSearchResults {
  items: YouTubeVideo[];
  nextPageToken?: string;
  prevPageToken?: string;
  totalResults?: number;
}

export const useYouTubeSearch = (query: string, maxResults: number = 10) => {
  return useQuery<YouTubeSearchResults>({
    queryKey: ['/api/youtube/search', query, maxResults],
    queryFn: async () => {
      if (!query.trim()) {
        return { items: [] };
      }
      
      const params = new URLSearchParams({
        q: query,
        maxResults: maxResults.toString()
      });
      
      const res = await fetch(`/api/youtube/search?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error('Failed to search YouTube videos');
      }
      
      const data = await res.json();
      
      // Transform the response to match our interface
      return {
        items: data.items.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnailUrl: item.snippet.thumbnails.medium.url,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt
        })),
        nextPageToken: data.nextPageToken,
        prevPageToken: data.prevPageToken,
        totalResults: data.pageInfo?.totalResults
      };
    },
    enabled: !!query.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useYouTubeVideo = (videoId: string | null) => {
  return useQuery<YouTubeVideo | null>({
    queryKey: ['/api/youtube/videos', videoId],
    queryFn: async () => {
      if (!videoId) {
        return null;
      }
      
      const res = await fetch(`/api/youtube/videos/${videoId}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch video details');
      }
      
      const data = await res.json();
      
      return {
        id: data.id,
        title: data.snippet.title,
        description: data.snippet.description,
        thumbnailUrl: data.snippet.thumbnails.medium.url,
        channelTitle: data.snippet.channelTitle,
        publishedAt: data.snippet.publishedAt,
        duration: data.contentDetails.duration
      };
    },
    enabled: !!videoId,
  });
};

// Function to parse YouTube video ID from URL
export function getYouTubeVideoId(url: string): string | null {
  // Regular expressions to match YouTube URLs
  const regexps = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/user\/[a-zA-Z0-9_-]+\/?\??.*v=([a-zA-Z0-9_-]{11})/
  ];
  
  for (const regex of regexps) {
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// Convert ISO 8601 duration to human-readable format
export function formatVideoDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  if (!match) {
    return '0:00';
  }
  
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Format view count
export function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  } else {
    return count.toString();
  }
}
