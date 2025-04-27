import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Watch from "@/pages/watch";
import Navbar from "@/components/navbar";
import { CreateSessionModal } from "@/components/modals/create-session";
import { JoinSessionModal } from "@/components/modals/join-session";

export interface User {
  id: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState<number | null>(null);
  const [location] = useLocation();

  // Check if user is logged in
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAuth();
  }, []);

  // Login helper function
  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!res.ok) {
        throw new Error('Login failed');
      }
      
      const userData = await res.json();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  // Register helper function
  const register = async (username: string, password: string, displayName?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          password, 
          displayName: displayName || username,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        }),
      });
      
      if (!res.ok) {
        throw new Error('Registration failed');
      }
      
      const userData = await res.json();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  // Logout helper function
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      setUser(null);
      queryClient.clear();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col min-h-screen bg-light">
          {/* Only show navbar on specific routes */}
          {!location.startsWith('/watch/') && (
            <Navbar 
              user={user} 
              onLogin={login}
              onRegister={register}
              onLogout={logout}
              onCreateSession={() => setShowCreateModal(true)} 
            />
          )}
          
          <Switch>
            <Route path="/" component={() => (
              <Home 
                user={user} 
                onLogin={login} 
                onRegister={register}
                onCreateSession={() => setShowCreateModal(true)}
                onJoinSession={(sessionId) => {
                  setJoinSessionId(sessionId);
                  setShowJoinModal(true);
                }}
              />
            )} />
            <Route path="/watch/:sessionId" component={Watch} />
            <Route component={NotFound} />
          </Switch>
          
          {/* Mobile navigation for specific routes */}
          {!location.startsWith('/watch/') && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
              <div className="flex items-center justify-around px-4 py-2">
                <button className="flex flex-col items-center p-2 text-primary">
                  <i className="fas fa-home text-lg"></i>
                  <span className="text-xs mt-1">Home</span>
                </button>
                <button className="flex flex-col items-center p-2 text-gray-500">
                  <i className="fas fa-search text-lg"></i>
                  <span className="text-xs mt-1">Search</span>
                </button>
                <button className="flex flex-col items-center p-2 text-gray-500">
                  <i className="fas fa-list text-lg"></i>
                  <span className="text-xs mt-1">Playlists</span>
                </button>
                <button className="flex flex-col items-center p-2 text-gray-500">
                  <i className="fas fa-user text-lg"></i>
                  <span className="text-xs mt-1">Profile</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Modals */}
          <CreateSessionModal 
            isOpen={showCreateModal} 
            onClose={() => setShowCreateModal(false)} 
            user={user}
          />
          
          <JoinSessionModal 
            isOpen={showJoinModal} 
            onClose={() => setShowJoinModal(false)} 
            sessionId={joinSessionId} 
            user={user}
          />
          
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
