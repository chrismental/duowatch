import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from '../App';

interface NavbarProps {
  user: User | null;
  onLogin: (username: string, password: string) => Promise<User>;
  onRegister: (username: string, password: string, displayName?: string) => Promise<User>;
  onLogout: () => Promise<void>;
  onCreateSession: () => void;
}

export default function Navbar({ user, onLogin, onRegister, onLogout, onCreateSession }: NavbarProps) {
  const [, navigate] = useLocation();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isRegistering) {
        await onRegister(username, password, displayName);
      } else {
        await onLogin(username, password);
      }
      setShowAuthDialog(false);
      // Reset form
      setUsername('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setError('Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span onClick={() => navigate('/')} className="text-2xl font-bold font-heading gradient-text cursor-pointer">DuoWatch</span>
          <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">BETA</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Button 
                onClick={onCreateSession}
                className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-full flex items-center shadow-md"
              >
                <i className="fas fa-plus-circle mr-2"></i>
                <span className="hidden sm:inline">New Session</span>
              </Button>
              
              <div className="relative group">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <img 
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                    alt={user.displayName || user.username} 
                    className="w-8 h-8 rounded-full border-2 border-accent"
                  />
                  <div className="hidden md:block">
                    <span className="block text-sm font-medium text-gray-700">{user.displayName || user.username}</span>
                    <span className="block text-xs text-gray-500">Online</span>
                  </div>
                </div>
                
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</a>
                  <button 
                    onClick={onLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Button 
              onClick={() => {
                setIsRegistering(false);
                setShowAuthDialog(true);
              }}
              className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-full shadow-md"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
      
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isRegistering ? 'Create Account' : 'Sign In'}</DialogTitle>
            <DialogDescription>
              {isRegistering 
                ? 'Create an account to start watching videos together with your partner.'
                : 'Sign in to your account to continue.'}
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleAuth}>
            {isRegistering && (
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                  />
                </div>
              </div>
            )}
            
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>
            
            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAuthDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    {isRegistering ? 'Creating Account...' : 'Signing In...'}
                  </div>
                ) : (
                  isRegistering ? 'Create Account' : 'Sign In'
                )}
              </Button>
            </DialogFooter>
          </form>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-primary hover:underline"
              disabled={isLoading}
            >
              {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
