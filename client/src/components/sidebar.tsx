import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { User } from '../App';

interface SidebarProps {
  user: User | null;
}

interface Playlist {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  itemCount?: number;
}

export default function Sidebar({ user }: SidebarProps) {
  const [, navigate] = useLocation();
  
  // Get user playlists if user is logged in
  const { data: playlists } = useQuery<Playlist[]>({
    queryKey: ['/api/playlists'],
    enabled: !!user,
  });
  
  return (
    <aside className="w-full lg:w-64 bg-white border-r border-gray-200 lg:flex flex-col hidden">
      <div className="p-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search videos..." 
            className="w-full bg-gray-100 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
        </div>
      </div>
      
      <nav className="flex-grow overflow-y-auto scrollbar-hide">
        <div className="px-4 py-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Main Menu</h2>
          <ul className="space-y-1">
            <li>
              <a 
                href="#" 
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-primary bg-primary bg-opacity-10"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/');
                }}
              >
                <i className="fas fa-home w-5 h-5 mr-2"></i>
                <span>Home</span>
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
              >
                <i className="fas fa-history w-5 h-5 mr-2"></i>
                <span>History</span>
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
              >
                <i className="fas fa-bookmark w-5 h-5 mr-2"></i>
                <span>Saved</span>
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
              >
                <i className="fas fa-sliders-h w-5 h-5 mr-2"></i>
                <span>Settings</span>
              </a>
            </li>
          </ul>
        </div>
        
        {user && (
          <div className="px-4 py-2 mt-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Playlists</h2>
            
            {playlists && playlists.length > 0 ? (
              playlists.map((playlist, index) => (
                <a 
                  key={playlist.id}
                  href="#" 
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <span className={`w-8 h-8 ${
                    index % 3 === 0 ? 'bg-primary' : 
                    index % 3 === 1 ? 'bg-secondary' : 'bg-accent'
                  } bg-opacity-20 flex items-center justify-center rounded mr-2`}>
                    <i className={`fas fa-list ${
                      index % 3 === 0 ? 'text-primary' : 
                      index % 3 === 1 ? 'text-secondary' : 'text-accent'
                    }`}></i>
                  </span>
                  <div className="flex-grow">
                    <span className="block text-sm">{playlist.name}</span>
                    <span className="block text-xs text-gray-500">
                      {playlist.itemCount || 0} videos
                    </span>
                  </div>
                </a>
              ))
            ) : (
              <div className="text-center py-4 text-sm text-gray-500">
                No playlists yet
              </div>
            )}
          </div>
        )}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="bg-primary bg-opacity-5 rounded-lg p-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                <i className="fas fa-crown"></i>
              </span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">Upgrade to Premium</h3>
              <p className="text-xs text-gray-600 mt-1">Get advanced features and remove ads</p>
              <button className="mt-2 px-3 py-1 bg-primary text-white text-xs rounded-full shadow-sm hover:bg-opacity-90">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
