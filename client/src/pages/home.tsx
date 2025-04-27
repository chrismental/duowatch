import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Sidebar from '@/components/sidebar';
import { User } from '../App';

interface Session {
  id: number;
  name: string;
  hostId: number;
  videoId: string;
  videoTitle?: string;
  videoThumbnail?: string;
  createdAt: string;
  active: boolean;
}

interface HomeProps {
  user: User | null;
  onLogin: (username: string, password: string) => Promise<User>;
  onRegister: (username: string, password: string, displayName?: string) => Promise<User>;
  onCreateSession: () => void;
  onJoinSession: (sessionId: number) => void;
}

export default function Home({ user, onLogin, onRegister, onCreateSession, onJoinSession }: HomeProps) {
  const [, navigate] = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  // Fetch active sessions
  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ['/api/sessions'],
    enabled: !!user
  });

  // Login or register
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isRegistering) {
        await onRegister(username, password, displayName);
      } else {
        await onLogin(username, password);
      }
    } catch (err) {
      setError('Authentication failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex flex-grow min-h-[calc(100vh-64px)]">
      <Sidebar user={user} />
      
      <div className="flex-grow">
        {user ? (
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold font-heading mb-2">Welcome back, {user.displayName || user.username}!</h1>
              <p className="text-lg text-gray-600">Watch YouTube videos together with your loved one.</p>
            </div>
            
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold font-heading">Your Sessions</h2>
                <Button onClick={onCreateSession} className="bg-primary hover:bg-opacity-90">
                  <i className="fas fa-plus-circle mr-2"></i>
                  New Session
                </Button>
              </div>
              
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-40 bg-gray-200 rounded-t-lg"></div>
                      <CardContent className="p-4">
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : sessions && sessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sessions.map((session) => (
                    <Card key={session.id} className="overflow-hidden hover:shadow-md transition">
                      <div className="relative">
                        <img 
                          src={session.videoThumbnail || `https://i.ytimg.com/vi/${session.videoId}/mqdefault.jpg`} 
                          alt={session.videoTitle || 'Video thumbnail'} 
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                          <Button 
                            onClick={() => navigate(`/watch/${session.id}`)}
                            className="bg-primary hover:bg-opacity-90"
                          >
                            <i className="fas fa-play mr-2"></i>
                            Watch Now
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-1 line-clamp-1">{session.name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${session.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {session.active ? 'Active' : 'Ended'}
                          </span>
                          <button 
                            onClick={() => onJoinSession(session.id)}
                            className="text-primary hover:text-primary-foreground/80 text-sm"
                          >
                            <i className="fas fa-info-circle mr-1"></i>
                            Details
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <div className="w-16 h-16 mx-auto bg-primary bg-opacity-10 rounded-full flex items-center justify-center mb-4">
                    <i className="fas fa-film text-primary text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No sessions yet</h3>
                  <p className="text-gray-600 mb-4">Start a new session to watch videos together with your partner</p>
                  <Button onClick={onCreateSession} className="bg-primary hover:bg-opacity-90">
                    <i className="fas fa-plus-circle mr-2"></i>
                    Create Your First Session
                  </Button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-bold font-heading mb-4">How It Works</h2>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-start">
                      <span className="w-8 h-8 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-primary font-medium">1</span>
                      </span>
                      <div>
                        <h3 className="font-medium mb-1">Create a Session</h3>
                        <p className="text-sm text-gray-600">Start by creating a new watching session with a YouTube video link</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <span className="w-8 h-8 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-primary font-medium">2</span>
                      </span>
                      <div>
                        <h3 className="font-medium mb-1">Invite Your Partner</h3>
                        <p className="text-sm text-gray-600">Share the session link with your partner to join you</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <span className="w-8 h-8 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-primary font-medium">3</span>
                      </span>
                      <div>
                        <h3 className="font-medium mb-1">Watch Together</h3>
                        <p className="text-sm text-gray-600">Enjoy synchronized playback and chat in real-time</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-bold font-heading mb-4">Featured Content</h2>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&h=300&q=80" 
                    alt="Couple watching video together" 
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="font-medium mb-2">Top Picks for Couples</h3>
                    <p className="text-sm text-gray-600 mb-4">Discover the best videos to watch together with your significant other</p>
                    <Button variant="outline" className="w-full">
                      <i className="fas fa-play-circle mr-2"></i>
                      Explore Collection
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-12 flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
              <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">
                <span className="gradient-text">Watch Together,</span><br /> 
                No Matter the Distance
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Enjoy synchronized YouTube videos with your partner. Share moments, laugh together, and create memories even when you're apart.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => setIsRegistering(false)}
                  className="bg-primary hover:bg-opacity-90 text-white px-6 py-2 rounded-full shadow-md"
                >
                  Get Started
                </Button>
                <Button 
                  variant="outline"
                  className="border-gray-300 text-gray-700 px-6 py-2 rounded-full"
                >
                  Learn More
                </Button>
              </div>
            </div>
            
            <div className="md:w-1/2">
              <Card className="max-w-md mx-auto">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold font-heading mb-6 text-center">
                    {isRegistering ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  
                  <form onSubmit={handleAuth} className="space-y-4">
                    {isRegistering && (
                      <div>
                        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                          Display Name
                        </label>
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your display name"
                        />
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    
                    <Button type="submit" className="w-full bg-primary hover:bg-opacity-90">
                      {isRegistering ? 'Create Account' : 'Sign In'}
                    </Button>
                  </form>
                  
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="text-sm text-primary hover:underline"
                    >
                      {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
